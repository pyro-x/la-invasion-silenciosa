// The one module that talks to MapLibre for the barrio map (LCHP-34),
// modelled on Alcorqueando's mapview.js: a framework-free factory returning
// a small API, so React (BarrioMap.tsx) only pushes state in and the screen
// never touches the map library.
//
// Sightings are still DOM markers here; LCHP-35 swaps them for a GeoJSON
// source behind this same API.
import maplibregl from 'maplibre-gl'
import { addAttribution } from './attribution'
import { LA_LATINA_BOUNDS, LA_LATINA_MAX_BOUNDS, tileProvider } from './tileProvider'

export type LngLat = { lat: number; lng: number }
export type MePosition = LngLat & { accuracyM: number }
export type MarkerMount = { id: string; el: HTMLElement }

export type BarrioMapHandlers = {
  /** A sighting pin was tapped. */
  onPick: (id: string) => void
  /** The map itself was tapped (not a pin). */
  onMapTap: () => void
  /** The user — not the app — started moving the map. */
  onUserMove: () => void
  /** The pin elements changed; React portals render the sprites into them. */
  onMarkers: (mounts: MarkerMount[]) => void
}

export type BarrioMapController = {
  /** Reconciles the pins and reports their elements through onMarkers. */
  setSightings: (sightings: readonly (LngLat & { id: string })[]) => void
  /** The picked pin is drawn over its neighbours. */
  setSelected: (id: string | null) => void
  setMe: (position: MePosition | null) => void
  /** Space covered by the bottom sheet: the map centres above it. */
  setBottomPadding: (px: number) => void
  /** Eases to a point; `minZoom` zooms in if the map is further out. */
  goTo: (target: LngLat, minZoom?: number) => void
  zoomBy: (delta: number) => void
  destroy: () => void
}

const VIEW_KEY = 'lis.map.view'
// Height of the floating mode switch the opening frame stays below.
const TOP_CHROME_PX = 64
const ME_SOURCE = 'me'
// GeoJSON's types are not a direct dependency; take them from MapLibre.
type GeoJsonData = Parameters<maplibregl.GeoJSONSource['setData']>[0]
const EMPTY: GeoJsonData = { type: 'FeatureCollection', features: [] }

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
  })
  const stopAttributionFold = addAttribution(map, 'bottom-left')

  const markers = new Map<string, maplibregl.Marker>()
  let selectedId: string | null = null
  // Pins overlap where sightings are close: the picked one must not end up
  // under another.
  const stack = (id: string, el: HTMLElement) => {
    el.style.zIndex = id === selectedId ? '3' : '2'
  }
  const meElement = document.createElement('div')
  meElement.className = 'map-me-dot'
  // Pins are what you tap: they stay above the user's own dot.
  meElement.style.zIndex = '1'
  const meMarker = new maplibregl.Marker({ element: meElement })
  let me: MePosition | null = null
  let loaded = false
  // A restored view is the user's own framing; only a fresh map is fitted.
  let framed = saved !== null

  function drawMe() {
    if (!loaded) return
    const source = map.getSource<maplibregl.GeoJSONSource>(ME_SOURCE)
    if (!me) {
      meMarker.remove()
      source?.setData(EMPTY)
      return
    }
    meMarker.setLngLat([me.lng, me.lat]).addTo(map)
    source?.setData({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circlePolygon(me, me.accuracyM)] },
      properties: {},
    })
  }

  map.on('load', () => {
    map.addSource(ME_SOURCE, { type: 'geojson', data: EMPTY })
    map.addLayer({
      id: 'me-accuracy',
      type: 'fill',
      source: ME_SOURCE,
      paint: { 'fill-color': '#105016', 'fill-opacity': 0.14, 'fill-outline-color': '#105016' },
    })
    loaded = true
    drawMe()
  })

  let bottomPx = 0
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

  const ease = (to: { center: [number, number]; zoom?: number }) => {
    // easeTo stops the previous ease itself, but only after `flight` is
    // set below: its moveend would then be taken for this one's.
    map.stop()
    userChoseView = false
    flight = to
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

  const userMoved = () => {
    userChoseView = true
    handlers.onUserMove()
  }
  map.on('movestart', (event) => {
    if (event.originalEvent) userMoved()
  })
  map.on('wheel', userMoved)
  map.on('moveend', () => {
    if (jumping) return
    if (flight) {
      flight = null
      return
    }
    if (!userChoseView) return
    userChoseView = false
    if (positionShown) return
    const center = map.getCenter()
    writeView({ center: [center.lng, center.lat], zoom: map.getZoom() })
  })
  map.on('click', () => handlers.onMapTap())

  return {
    setSightings(sightings) {
      const seen = new Set<string>()
      const mounts: MarkerMount[] = []
      for (const sighting of sightings) {
        seen.add(sighting.id)
        let marker = markers.get(sighting.id)
        if (marker) {
          marker.setLngLat([sighting.lng, sighting.lat])
        } else {
          const el = document.createElement('div')
          el.style.cursor = 'pointer'
          stack(sighting.id, el)
          el.addEventListener('click', (event) => {
            event.stopPropagation()
            handlers.onPick(sighting.id)
          })
          marker = new maplibregl.Marker({ element: el })
            .setLngLat([sighting.lng, sighting.lat])
            .addTo(map)
          markers.set(sighting.id, marker)
        }
        mounts.push({ id: sighting.id, el: marker.getElement() })
      }
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove()
          markers.delete(id)
        }
      }
      handlers.onMarkers(mounts)
    },

    setSelected(id) {
      selectedId = id
      for (const [markerId, marker] of markers) stack(markerId, marker.getElement())
    },

    setMe(position) {
      me = position
      if (position) positionShown = true
      drawMe()
    },

    setBottomPadding(px) {
      bottomPx = px
      // setPadding stops any ease where it is. Picking a pin both starts one
      // and resizes the sheet, so the ease is sent again with the new
      // padding instead of being cut short of the pin.
      if (flight) ease(flight)
      else jump(() => map.setPadding(padding()))
      // The opening frame is fitted once the sheet's height is known, so the
      // barrio lands in the part of the map that is actually visible. Zero
      // is "not measured yet", not a height.
      if (!framed && px > 0) {
        framed = true
        userChoseView = false
        // The sheet is already in the map's own padding (set just above);
        // fitBounds adds its padding on top, so only the margins go here.
        jump(() =>
          map.fitBounds(LA_LATINA_BOUNDS, {
            padding: { top: TOP_CHROME_PX, bottom: 16, left: 16, right: 16 },
            duration: 0,
          }),
        )
      }
    },

    goTo(target, minZoom) {
      ease({
        center: [target.lng, target.lat],
        ...(minZoom !== undefined && map.getZoom() < minZoom ? { zoom: minZoom } : {}),
      })
    },

    zoomBy(delta) {
      // An app ease in flight ends as the app's (see ease()); the zoom is
      // the user's.
      map.stop()
      userChoseView = true
      map.easeTo({ zoom: map.getZoom() + delta, duration: 250 })
    },

    destroy() {
      stopAttributionFold()
      meMarker.remove()
      map.remove()
      markers.clear()
    },
  }
}
