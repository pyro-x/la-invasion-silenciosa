// The one module that talks to MapLibre for the barrio map (LCHP-34),
// modelled on Alcorqueando's mapview.js: a framework-free factory returning
// a small API, so React (BarrioMap.tsx) only pushes state in and the screen
// never touches the map library.
//
// Sightings are map data (LCHP-35): one clustered GeoJSON source drawn by
// symbol layers, all of them again as a heat map, and the picked one on
// its own so a cluster can never hide it.
import maplibregl from 'maplibre-gl'
import { addAttribution } from './attribution'
import { ARRIVAL_MS, arrivalOpacities, blinkDelayMs } from './blink'
import {
  PIN_SIZE,
  PIN_SPECIES,
  PIN_STATES,
  pinName,
  pinSvg,
  rasterisePin,
  type PinColors,
  type PinState,
} from './pinArt'
import { LA_LATINA_BOUNDS, LA_LATINA_MAX_BOUNDS, tileProvider } from './tileProvider'
import type { MapSightingGeo } from '@/types/sighting'

export type LngLat = { lat: number; lng: number }
export type MePosition = LngLat & { accuracyM: number }

export type BarrioMapHandlers = {
  /** A sighting pin was tapped. */
  onPick: (id: string) => void
  /** The map itself was tapped (not a pin, not a cluster). */
  onMapTap: () => void
  /** The user — not the app — started moving the map. */
  onUserMove: () => void
}

export type BarrioMapController = {
  setSightings: (sightings: readonly MapSightingGeo[]) => void
  /** The picked pin is drawn over everything, also where the rest are clustered. */
  setSelected: (id: string | null) => void
  /** Density of sightings instead of pins. */
  setHeat: (on: boolean) => void
  setMe: (position: MePosition | null) => void
  /** Space covered by the bottom sheet: the map centres above it. */
  setBottomPadding: (px: number) => void
  /**
   * Eases to a point, at the zoom the map has. With the id of a sighting, to
   * where that sighting is drawn, which need not be its own coordinate.
   */
  goTo: (target: LngLat & { id?: string }) => void
  /**
   * Eases to the neighbour's position, carrying on a zoom still under way.
   * `minZoom` zooms in if the map would otherwise end further out.
   */
  follow: (target: LngLat, minZoom?: number) => void
  zoomBy: (delta: number) => void
  destroy: () => void
}

// A pin with a blinking twin over it (see the blink) is not drawn: it is
// still there to be tapped.
const UNDER_TWIN: maplibregl.ExpressionSpecification = [
  'case',
  ['boolean', ['feature-state', 'twin'], false],
  0,
  1,
]

const VIEW_KEY = 'lis.map.view'
// Height of the floating mode switch the opening frame stays below.
const TOP_CHROME_PX = 64
// How much a sighting counts in the heat map, by status.
export const HEAT_WEIGHT = { approved: 1, pending: 0.4 }
// A finger is not a cursor: a tap this close to a pin is a tap on it.
const TAP_SLOP_PX = 14

const ME_AREA = 'me'
const ME_POINT = 'me-point'
const SIGHTINGS = 'sightings'
const HEAT = 'sightings-heat'
const SELECTED = 'sighting-selected'
const PIN_LAYERS = [
  'sighting-clusters',
  'sighting-cluster-count',
  'sighting-points',
  'sighting-pending',
  SELECTED,
]
const TAP_LAYERS = [SELECTED, 'sighting-pending', 'sighting-points', 'sighting-clusters']

// GeoJSON's types are not a direct dependency; take them from MapLibre.
type GeoJsonData = Parameters<maplibregl.GeoJSONSource['setData']>[0]
const EMPTY: GeoJsonData = { type: 'FeatureCollection', features: [] }

const points = (sightings: readonly MapSightingGeo[]): GeoJsonData => ({
  type: 'FeatureCollection',
  features: sightings.map((s) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    properties: { id: s.id, species: s.speciesId, status: s.status },
  })),
})

// How far apart sightings that share a coordinate are drawn, in metres.
const FAN_M = 10

/**
 * Where to draw each sighting. Public coordinates are snapped to a coarse
 * grid (D-046), so several often share one exactly; drawn there they would
 * be one pin that no zoom can take apart, and only the top one could be
 * tapped. Those are set on rings around their shared point instead — six on
 * the first, twelve on the next — in the order of their ids, so a refresh
 * with the same sightings does not shuffle them (one more in the cell can
 * move the others a slot). Only the drawing moves — for up to eighteen on a
 * point, by less than the grid's own imprecision — and nothing finer than
 * the public coordinate exists here.
 */
export function fanOut<T extends LngLat & { id: string }>(sightings: readonly T[]): T[] {
  const cells = new Map<string, T[]>()
  for (const sighting of sightings) {
    const key = `${sighting.lng},${sighting.lat}`
    cells.set(key, [...(cells.get(key) ?? []), sighting])
  }
  const spots = new Map<string, LngLat>()
  for (const cell of cells.values()) {
    if (cell.length === 1) continue
    let ring = 1
    let slot = 0
    for (const sighting of [...cell].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const slots = 6 * ring
      const angle = (2 * Math.PI * slot) / slots
      const metres = FAN_M * ring
      spots.set(sighting.id, {
        lat: sighting.lat + (metres * Math.cos(angle)) / 111_320,
        lng:
          sighting.lng +
          (metres * Math.sin(angle)) / (111_320 * Math.cos((sighting.lat * Math.PI) / 180)),
      })
      if (++slot === slots) {
        ring++
        slot = 0
      }
    }
  }
  return sightings.map((sighting) => ({ ...sighting, ...spots.get(sighting.id) }))
}

type SavedView = { center: [number, number]; zoom: number }

function readView(): SavedView | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    if (!raw) return null
    const view: Partial<SavedView> = JSON.parse(raw)
    const [lng, lat] = view.center ?? []
    if (typeof lng !== 'number' || typeof lat !== 'number' || typeof view.zoom !== 'number') {
      return null
    }
    const [[west, south], [east, north]] = LA_LATINA_MAX_BOUNDS
    if (lng < west || lng > east || lat < south || lat > north) return null
    return { center: [lng, lat], zoom: view.zoom }
  } catch {
    return null
  }
}

function forgetView() {
  try {
    localStorage.removeItem(VIEW_KEY)
  } catch {
    // storage unavailable: there is nothing to forget
  }
}

function writeView(view: SavedView) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  } catch {
    // storage unavailable: the map just opens on the barrio next time
  }
}

/** A ring approximating a circle of `radiusM` metres around a point. */
export function circlePolygon({ lat, lng }: LngLat, radiusM: number, steps = 48): number[][] {
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))
  const ring: number[][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)])
  }
  return ring
}

export function createBarrioMap(
  container: HTMLElement,
  handlers: BarrioMapHandlers,
): BarrioMapController {
  const saved = readView()
  const map = new maplibregl.Map({
    container,
    style: tileProvider.style,
    ...(saved
      ? { center: saved.center, zoom: saved.zoom }
      : { bounds: LA_LATINA_BOUNDS, fitBoundsOptions: { padding: 16 } }),
    maxBounds: LA_LATINA_MAX_BOUNDS,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    // A tilted map draws its pins smaller the further up they are; a page
    // element is not, so a twin would stop matching its pin.
    maxPitch: 0,
  })
  const stopAttributionFold = addAttribution(map, 'bottom-left')

  const theme = getComputedStyle(container)
  const themed = (name: string, fallback: string) => theme.getPropertyValue(name).trim() || fallback
  const colors: PinColors = {
    card: themed('--card', '#fffdf8'),
    line: themed('--line', '#ddccaf'),
    warn: themed('--warn', '#e07a16'),
    accent: themed('--accent', '#a00000'),
  }
  const onAccent = themed('--on-accent', '#fff5ea')
  const meColor = themed('--accent2', '#105016')

  let destroyed = false
  let sightings: readonly MapSightingGeo[] = []
  // The same sightings where they are drawn (see fanOut).
  let drawn: readonly MapSightingGeo[] = []
  let selectedId: string | null = null
  let heat = false
  let me: MePosition | null = null
  // The style has loaded and the position's layers exist.
  let styleReady = false
  // The pin images are registered and the sighting layers exist.
  let pinsReady = false
  // A restored view is the user's own framing; only a fresh map is fitted.
  let framed = saved !== null

  const source = (id: string) => map.getSource<maplibregl.GeoJSONSource>(id)

  function drawMe() {
    if (!styleReady) return
    source(ME_AREA)?.setData(
      me
        ? {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [circlePolygon(me, me.accuracyM)] },
            properties: {},
          }
        : EMPTY,
    )
    source(ME_POINT)?.setData(
      me
        ? {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [me.lng, me.lat] },
            properties: {},
          }
        : EMPTY,
    )
  }

  let bottomPx = 0
  let pickedPending = false

  // A pin drawn on its own is left out of the layer it would otherwise be in.
  const unpicked = (status: MapSightingGeo['status']): maplibregl.FilterSpecification => [
    'all',
    ['!', ['has', 'point_count']],
    ['==', ['get', 'status'], status],
    ['!=', ['get', 'id'], selectedId ?? ''],
  ]

  function drawSelected() {
    if (!pinsReady) return
    const picked = drawn.find((s) => s.id === selectedId)
    pickedPending = picked?.status === 'pending'
    source(SELECTED)?.setData(points(picked ? [picked] : []))
    map.setFilter('sighting-points', unpicked('approved'))
    map.setFilter('sighting-pending', unpicked('pending'))
    dropTwins(stillDrawn)
    focusOnPicked()
  }

  // The blink is not drawn by the map. A layer cannot be animated without
  // the whole map being drawn again on every frame — a third of a phone's
  // main thread, measured — so the blinking is done by a twin of the pin
  // in the page, with CSS, which costs the map nothing; the map leaves the
  // pin undrawn while it has one, so the two are never seen at once. Only
  // the pending pins in sight have a twin: a handful. The twins
  // follow the page's clock, as the ring in the «Por verificar» chips does,
  // so everything blinks together.
  type Twin = { marker: maplibregl.Marker; source: string; id: string; lng: number; lat: number }
  const twins = new Map<string, Twin>()
  let placed = ''
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')

  function dropTwins(keep: (twin: Twin) => boolean = () => false) {
    for (const [key, twin] of twins) {
      if (keep(twin)) continue
      twin.marker.remove()
      if (pinsReady && !destroyed) map.removeFeatureState({ source: twin.source, id: twin.id })
      twins.delete(key)
    }
  }
  // Whether the pin a twin covers is still drawn where the twin is.
  const stillDrawn = (twin: Twin) => {
    const sighting = drawn.find((s) => s.id === twin.id)
    if (!sighting || sighting.status !== 'pending') return false
    if (sighting.lng !== twin.lng || sighting.lat !== twin.lat) return false
    if (twin.source === SELECTED) return twin.id === selectedId
    return twin.id !== selectedId && !overPicked(sighting)
  }
  // The map draws the picked pin over every other; a page element is over
  // the whole map. A pin that touches the picked one goes without a twin.
  const overPicked = (sighting: MapSightingGeo) => {
    const picked = drawn.find((s) => s.id === selectedId)
    if (!picked || picked.id === sighting.id) return false
    const a = map.project([sighting.lng, sighting.lat])
    const b = map.project([picked.lng, picked.lat])
    return Math.abs(a.x - b.x) < PIN_SIZE && Math.abs(a.y - b.y) < PIN_SIZE
  }
  function twinOf(sighting: MapSightingGeo, picked: boolean) {
    const twin = document.createElement('div')
    twin.className = 'pin-twin'
    // Decoration: the pin is the map's, and MapLibre would call this a button.
    twin.setAttribute('role', 'presentation')
    twin.setAttribute('aria-hidden', 'true')
    const face = artFailed ? document.createElement('span') : document.createElement('img')
    if (face instanceof HTMLImageElement) {
      face.alt = ''
      face.width = PIN_SIZE
      face.height = PIN_SIZE
      face.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(sighting.speciesId, picked ? 'selected' : 'pending', colors))}`
    } else {
      const { radius, stroke, color, ring } = dotOf(picked ? 'selected' : 'pending')
      face.style.cssText = `display:block;box-sizing:border-box;width:${2 * (radius + stroke)}px;height:${2 * (radius + stroke)}px;border-radius:50%;background:${color};border:${stroke}px solid ${ring}`
    }
    twin.append(face)
    const blink = () => {
      face.style.animationDelay = `${blinkDelayMs(performance.now())}ms`
      face.classList.add('is-blinking')
    }
    // A pin is whole until its twin takes its place, and the blink is
    // wherever the clock has it: the pin would drop to that at once, a
    // flicker before the slow blink. So the twin arrives whole, eases to
    // where the blink will be, and only then starts blinking: whatever frame
    // the browser starts on, there is nothing underneath but a whole pin.
    const arrive = () => {
      if (!face.animate) {
        blink()
        return
      }
      const arrival = face.animate(
        arrivalOpacities(performance.now()).map((opacity) => ({ opacity })),
        { duration: ARRIVAL_MS, fill: 'forwards' },
      )
      arrival.onfinish = () => {
        blink()
        requestAnimationFrame(() => arrival.cancel())
      }
    }
    return { twin, arrive }
  }

  // Which pending pins are in sight is only known once the map has drawn
  // them, so the map is asked a moment after anything that can change the
  // answer — by a timer, since a map waiting for street tiles never reports
  // idle. The wait lets the map place the pins of the new view first.
  const PLACED_MS = 400
  let lookTimer: number | null = null
  // On a slow device the first look can still read the previous view's pins:
  // it looks twice.
  const lookSoon = (again = true) => {
    if (lookTimer !== null) window.clearTimeout(lookTimer)
    lookTimer = window.setTimeout(() => {
      lookTimer = null
      if (destroyed || !pinsReady) return
      if (map.isMoving() || !map.isSourceLoaded(SIGHTINGS)) {
        lookSoon(again)
        return
      }
      lookForPending()
      if (again && !heat) lookSoon(false)
    }, PLACED_MS)
  }
  // What the neighbour can see: the map continues under the sheet.
  const inSight = (layer: string) => {
    const { clientWidth, clientHeight } = map.getCanvas()
    const shown: [maplibregl.PointLike, maplibregl.PointLike] = [
      [0, 0],
      [clientWidth, Math.max(0, clientHeight - bottomPx)],
    ]
    return map.queryRenderedFeatures(shown, { layers: [layer] })
  }
  function lookForPending() {
    if (!pinsReady || destroyed) return
    if (lookTimer !== null) window.clearTimeout(lookTimer)
    lookTimer = null
    const wanted = new Map<string, { source: string; sighting: MapSightingGeo }>()
    if (!heat && !reducedMotion?.matches) {
      for (const feature of inSight('sighting-pending')) {
        const sighting = drawn.find((s) => s.id === feature.properties.id)
        if (!sighting || overPicked(sighting)) continue
        wanted.set(`${SIGHTINGS}:${sighting.id}`, { source: SIGHTINGS, sighting })
      }
      const picked = drawn.find((s) => s.id === selectedId)
      if (picked && pickedPending && inSight(SELECTED).length > 0) {
        wanted.set(`${SELECTED}:${picked.id}`, { source: SELECTED, sighting: picked })
      }
    }
    dropTwins((twin) => wanted.has(`${twin.source}:${twin.id}`) && stillDrawn(twin))
    for (const [key, { source: from, sighting }] of wanted) {
      if (twins.has(key)) continue
      const { id, lng, lat } = sighting
      const { twin, arrive } = twinOf(sighting, from === SELECTED)
      const marker = new maplibregl.Marker({ element: twin, subpixelPositioning: true })
        .setLngLat([lng, lat])
        .addTo(map)
      arrive()
      map.setFeatureState({ source: from, id }, { twin: true })
      twins.set(key, { marker, source: from, id, lng, lat })
    }
  }
  reducedMotion?.addEventListener('change', lookForPending)
  // A pin joining or leaving a cluster badge mid-zoom would leave its twin
  // floating, and a turn of the map can bring one over the picked pin: they
  // come back once the map has settled.
  map.on('zoomstart', () => dropTwins())
  map.on('rotatestart', () => dropTwins())

  function drawSightings() {
    if (!pinsReady) return
    source(SIGHTINGS)?.setData(points(drawn))
    // The heat map counts every sighting, at its true public coordinate:
    // those on one spot should pile up there.
    source(HEAT)?.setData(points(sightings))
    drawSelected()
    lookSoon()
  }

  function drawMode() {
    if (!pinsReady) return
    for (const id of PIN_LAYERS) map.setLayoutProperty(id, 'visibility', heat ? 'none' : 'visible')
    map.setLayoutProperty('sighting-heat', 'visibility', heat ? 'visible' : 'none')
    if (heat) dropTwins()
    else lookSoon()
  }

  // A browser that cannot turn the artwork into images gets the same three
  // layers as plain dots: everything else — taps, selection, the blink, the
  // heat map — works on them unchanged.
  let artFailed = false
  const dotOf = (state: PinState) => ({
    radius: state === 'selected' ? 10 : 8,
    stroke: state === 'selected' ? 4 : 2,
    color: state === 'selected' ? colors.card : state === 'pending' ? colors.warn : colors.accent,
    ring: state === 'selected' ? colors.accent : colors.card,
  })
  async function registerPins() {
    // Pixel art is only crisp at whole multiples of its size.
    const ratio = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)))
    for (const species of PIN_SPECIES) {
      for (const state of PIN_STATES) {
        try {
          const image = await rasterisePin(pinSvg(species, state, colors), PIN_SIZE * ratio)
          if (destroyed) return
          const name = pinName(species, state)
          if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio: ratio })
        } catch {
          artFailed = true
        }
      }
    }
  }

  function addMeLayers() {
    map.addSource(ME_AREA, { type: 'geojson', data: EMPTY })
    map.addSource(ME_POINT, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: 'me-accuracy',
      type: 'fill',
      source: ME_AREA,
      paint: { 'fill-color': meColor, 'fill-opacity': 0.14, 'fill-outline-color': meColor },
    })
    map.addLayer({
      id: 'me-halo',
      type: 'circle',
      source: ME_POINT,
      paint: { 'circle-radius': 11, 'circle-color': meColor, 'circle-opacity': 0.3 },
    })
    map.addLayer({
      id: 'me-dot',
      type: 'circle',
      source: ME_POINT,
      paint: {
        'circle-radius': 6,
        'circle-color': meColor,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    })
  }

  // Added after the position's layers, so pins are drawn over the user's own
  // dot: on top of a pin it read as a badge on the creature.
  function addSightingLayers() {
    map.addSource(SIGHTINGS, {
      type: 'geojson',
      data: EMPTY,
      // Feature ids, for the state that leaves a pin undrawn under its twin.
      promoteId: 'id',
      cluster: true,
      clusterRadius: 46,
      clusterMaxZoom: 17,
      clusterProperties: { pending: ['+', ['case', ['==', ['get', 'status'], 'pending'], 1, 0]] },
    })
    map.addSource(HEAT, { type: 'geojson', data: EMPTY })
    map.addSource(SELECTED, { type: 'geojson', data: EMPTY, promoteId: 'id' })

    map.addLayer({
      id: 'sighting-heat',
      type: 'heatmap',
      source: HEAT,
      layout: { visibility: 'none' },
      paint: {
        // What the barrio has confirmed weighs more than what one
        // neighbour has reported (David, 2026-10-09).
        'heatmap-weight': [
          'case',
          ['==', ['get', 'status'], 'approved'],
          HEAT_WEIGHT.approved,
          HEAT_WEIGHT.pending,
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 13, 0.7, 17, 1.5],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 13, 20, 16, 44, 18, 80],
        'heatmap-opacity': 0.9,
        // The prototype's ramp (captura_04): yellow at the edges, deep red
        // where sightings pile up.
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(255, 214, 46, 0)',
          0.22,
          'rgba(255, 214, 46, 0.55)',
          0.45,
          'rgba(255, 150, 12, 0.76)',
          0.7,
          'rgba(232, 52, 22, 0.88)',
          1,
          'rgba(150, 12, 8, 0.94)',
        ],
      },
    })
    map.addLayer({
      id: 'sighting-clusters',
      type: 'circle',
      source: SIGHTINGS,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 19, 50, 23],
        'circle-stroke-width': 3,
        // A cluster holding something to verify wears the pending colour.
        'circle-stroke-color': ['case', ['>', ['get', 'pending'], 0], colors.warn, colors.card],
      },
    })
    map.addLayer({
      id: 'sighting-cluster-count',
      type: 'symbol',
      source: SIGHTINGS,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['to-string', ['get', 'point_count']],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': onAccent },
    })
    const pin = (state: PinState): maplibregl.SymbolLayerSpecification['layout'] => ({
      'icon-image': ['concat', 'pin-', ['get', 'species'], `-${state}`],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    })
    const dot = (state: PinState): maplibregl.CircleLayerSpecification['paint'] => {
      const { radius, stroke, color, ring } = dotOf(state)
      return {
        'circle-radius': radius,
        'circle-color': color,
        'circle-stroke-width': stroke,
        'circle-stroke-color': ring,
        'circle-opacity': UNDER_TWIN,
        'circle-stroke-opacity': UNDER_TWIN,
      }
    }
    const drawnAs = [
      {
        id: 'sighting-points',
        source: SIGHTINGS,
        state: 'validated',
        filter: unpicked('approved'),
      },
      { id: 'sighting-pending', source: SIGHTINGS, state: 'pending', filter: unpicked('pending') },
      { id: SELECTED, source: SELECTED, state: 'selected', filter: undefined },
    ] as const
    for (const { id, source: from, state, filter } of drawnAs) {
      const which = filter ? { filter } : {}
      if (artFailed) {
        map.addLayer({ id, type: 'circle', source: from, ...which, paint: dot(state) })
      } else {
        map.addLayer({
          id,
          type: 'symbol',
          source: from,
          ...which,
          layout: pin(state),
          paint: { 'icon-opacity': UNDER_TWIN },
        })
      }
    }

    for (const id of TAP_LAYERS) {
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
    }
  }

  map.on('idle', lookForPending)

  map.on('load', () => {
    addMeLayers()
    styleReady = true
    drawMe()
    // The pin layers wait for their images: a symbol laid out before its
    // image exists is left blank until the tile is laid out again.
    void registerPins().then(() => {
      if (destroyed) return
      addSightingLayers()
      pinsReady = true
      drawSightings()
      drawMode()
    })
  })

  const padding = () => ({ top: 0, left: 0, right: 0, bottom: bottomPx })

  // Only a view the user chose is remembered. The app's own moves — the
  // opening fit, a padding change, easing to a pin, following — are never
  // written to storage. And once the user's position has been on this map,
  // nothing is, until the map is created again: the camera may still sit on
  // or next to where they are after the dot is gone.
  let userChoseView = false
  let positionShown = false
  // Where the app is easing to, while it is. Its moveend is the app's even
  // if a gesture landed in the middle (a wheel that interrupts an ease ends
  // it with the app's centre, not the user's).
  let flight: { center: [number, number]; zoom?: number } | null = null
  // True during a camera change that ends before it returns.
  let jumping = false
  // The zoom a move under way is heading for, when it has one: the zoom-in
  // to the position (which following carries on), or a step the user asked
  // for with a button or by tapping a cluster.
  let carriedZoom: number | null = null
  // Where such a step is also heading, when it moves the centre (a cluster).
  let stepCenter: [number, number] | null = null
  // The sighting the camera was last sent to and has stayed on: if a refresh
  // moves where it is drawn (a cell-mate arrived or left), the camera goes
  // with it. Anything else the user or the app does with the camera ends it.
  let focusedOn: string | null = null
  let focusedAt: LngLat | null = null
  function focusOnPicked() {
    if (focusedOn === null || focusedOn !== selectedId) return
    const spot = drawn.find((s) => s.id === focusedOn)
    if (!spot || !focusedAt) return
    if (spot.lng === focusedAt.lng && spot.lat === focusedAt.lat) return
    focusedAt = { lng: spot.lng, lat: spot.lat }
    ease({ center: [spot.lng, spot.lat] })
  }

  // Opening a cluster waits for the map's answer. Whatever is asked of the
  // map meanwhile — another tap, a drag, a pin picked, a zoom button, a
  // change of mode, fresh sightings — is newer, and wins. The app's own
  // re-sends (a sheet resize, a position update) are not.
  let intent = 0

  const ease = (to: { center: [number, number]; zoom?: number }) => {
    // easeTo stops the previous ease itself, but only after `flight` is
    // set below: its moveend would then be taken for this one's.
    map.stop()
    userChoseView = false
    flight = to
    carriedZoom = to.zoom ?? null
    map.easeTo({ ...to, padding: padding(), duration: 500 })
  }
  const jump = (change: () => void) => {
    // This drops a gesture in progress without a moveend for it.
    map.stop()
    userChoseView = false
    jumping = true
    change()
    jumping = false
  }
  // Where a zoom will really end: MapLibre keeps it inside the zoom limits
  // and no further out than the pan limit lets this viewport go.
  const reachable = (zoom: number) => map.transform.applyConstrain(map.getCenter(), zoom).zoom

  // A step the user asked for — a zoom button, a tap on a cluster: the
  // camera move is the app's call, the choice is the user's.
  const userStep = (wanted: number, center?: [number, number]) => {
    focusedOn = null
    map.stop()
    userChoseView = true
    const zoom = reachable(wanted)
    carriedZoom = zoom
    stepCenter = center ?? null
    map.easeTo({ ...(center ? { center } : {}), zoom, duration: center ? 450 : 250 })
  }

  const userMoved = () => {
    intent++
    focusedOn = null
    userChoseView = true
    handlers.onUserMove()
  }
  map.on('movestart', (event) => {
    if (event.originalEvent) userMoved()
  })
  map.on('wheel', userMoved)
  map.on('moveend', () => {
    lookSoon()
    // A step that was stopped before it arrived — by the app or by the
    // user's own hand — ends at a zoom nobody chose. Arrival is judged
    // against what is reachable now: the window may have changed size on
    // the way.
    const cutStep = carriedZoom !== null && Math.abs(map.getZoom() - reachable(carriedZoom)) > 0.001
    carriedZoom = null
    stepCenter = null
    if (jumping) return
    if (flight) {
      flight = null
      return
    }
    if (cutStep) return
    if (!userChoseView) return
    userChoseView = false
    if (positionShown) return
    const center = map.getCenter()
    writeView({ center: [center.lng, center.lat], zoom: map.getZoom() })
  })

  map.on('click', (event) => {
    const mine = ++intent
    const { x, y } = event.point
    const hits =
      pinsReady && !heat
        ? map.queryRenderedFeatures(
            [
              [x - TAP_SLOP_PX, y - TAP_SLOP_PX],
              [x + TAP_SLOP_PX, y + TAP_SLOP_PX],
            ],
            { layers: TAP_LAYERS },
          )
        : []
    let nearest: { center: [number, number]; id: string; cluster: number } | null = null
    let distance = Infinity
    for (const hit of hits) {
      if (hit.geometry.type !== 'Point') continue
      const [lng, lat] = hit.geometry.coordinates
      const at = map.project([lng, lat])
      const d = Math.hypot(at.x - x, at.y - y)
      if (d >= distance) continue
      distance = d
      nearest = {
        center: [lng, lat],
        id: String(hit.properties.id),
        cluster: Number(hit.properties.cluster_id),
      }
    }
    if (!nearest) {
      handlers.onMapTap()
      return
    }
    if (Number.isNaN(nearest.cluster)) {
      handlers.onPick(nearest.id)
      return
    }
    // A cluster opens: zoom until its pins come apart.
    const { cluster, center } = nearest
    void source(SIGHTINGS)
      ?.getClusterExpansionZoom(cluster)
      .then(
        (zoom) => {
          if (destroyed || mine !== intent) return
          handlers.onUserMove()
          userStep(zoom, center)
        },
        // The map no longer knows that cluster: the tap is lost, and the
        // next one finds whatever is there now.
        () => {},
      )
  })

  return {
    setSightings(next) {
      intent++
      sightings = next
      drawn = fanOut(next)
      // Who is where decides the clusters. When that changes, a pin with a
      // twin may be inside a badge once the map has drawn the new data: the
      // twins wait for the look that follows.
      const places = drawn
        .map((s) => `${s.id}@${s.lng},${s.lat}`)
        .sort()
        .join(' ')
      if (places !== placed) dropTwins()
      placed = places
      drawSightings()
    },

    setSelected(id) {
      selectedId = id
      drawSelected()
      lookSoon()
    },

    setHeat(on) {
      intent++
      heat = on
      drawMode()
    },

    setMe(position) {
      me = position
      if (position && !positionShown) {
        positionShown = true
        // Nothing more will be stored, so an older view would come back on
        // every visit, however the neighbour moves the map now.
        forgetView()
      }
      drawMe()
    },

    setBottomPadding(px) {
      bottomPx = px
      lookSoon()
      // Zero is "not measured yet", not a height.
      const opening = !framed && px > 0
      // setPadding stops whatever is moving, so a move under way is sent
      // again: picking a pin both starts an ease and resizes the sheet, and
      // a step the user asked for would otherwise end part-way. The opening
      // fit replaces either.
      const step = flight ? null : carriedZoom
      const center = stepCenter
      if (flight && !opening) ease(flight)
      else jump(() => map.setPadding(padding()))
      if (opening) {
        // The opening frame is fitted once the sheet's height is known, so
        // the barrio lands in the part of the map that is actually visible.
        // The sheet is already in the map's own padding (set just above);
        // fitBounds adds its padding on top, so only the margins go here.
        framed = true
        jump(() =>
          map.fitBounds(LA_LATINA_BOUNDS, {
            padding: { top: TOP_CHROME_PX, bottom: 16, left: 16, right: 16 },
            duration: 0,
          }),
        )
      } else if (step !== null) {
        userStep(step, center ?? undefined)
      }
    },

    goTo(target) {
      intent++
      const spot = drawn.find((s) => s.id === target.id) ?? target
      focusedOn = target.id ?? null
      focusedAt = { lng: spot.lng, lat: spot.lat }
      ease({ center: [spot.lng, spot.lat] })
    },

    follow(target, minZoom) {
      // With a minimum zoom this is the neighbour's tap on the locate
      // button, which supersedes a cluster still opening; without one it is
      // a position update, which does not.
      if (minZoom !== undefined) intent++
      focusedOn = null
      // A phone sends several fixes in its first second, and a recentre
      // stops whatever is moving: without this, each one cut the zoom-in of
      // the one before, or a zoom-button step, part-way. Only following
      // carries a zoom on; a pin picked meanwhile keeps the zoom it finds.
      const heading = carriedZoom ?? map.getZoom()
      const zoom = minZoom !== undefined && heading < minZoom ? minZoom : (carriedZoom ?? undefined)
      ease({ center: [target.lng, target.lat], ...(zoom !== undefined ? { zoom } : {}) })
    },

    zoomBy(delta) {
      intent++
      // A second press while a step is still under way adds to where that
      // step was heading, not to where it had got to.
      const stepping = !flight && carriedZoom !== null
      const center = stepping ? stepCenter : null
      userStep(
        (stepping && carriedZoom !== null ? carriedZoom : map.getZoom()) + delta,
        center ?? undefined,
      )
    },

    destroy() {
      destroyed = true
      if (lookTimer !== null) window.clearTimeout(lookTimer)
      dropTwins()
      reducedMotion?.removeEventListener('change', lookForPending)
      stopAttributionFold()
      map.remove()
    },
  }
}
