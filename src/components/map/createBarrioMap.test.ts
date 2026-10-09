import {
  circlePolygon,
  createBarrioMap,
  fanOut,
  HEAT_WEIGHT,
  type BarrioMapController,
} from './createBarrioMap'
import type { MapSightingGeo } from '@/types/sighting'

type MapEvent = { originalEvent?: Event; point?: { x: number; y: number } }
type MapHandler = (event: MapEvent) => void
type EaseOptions = { center?: [number, number]; zoom?: number; padding?: { bottom: number } }
type MapOptions = { center?: [number, number]; zoom?: number; bounds?: number[][] }
type Hit = {
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { id?: string; cluster_id?: number }
}
type Layer = {
  id: string
  type: string
  source: string
  filter?: object
  paint?: Record<string, object | number | string>
}
const typeOf = (id: string) => recorded.layers.find((layer) => layer.id === id)?.type
type SourceSpec = { cluster?: boolean; clusterMaxZoom?: number; clusterProperties?: object }
const recorded = vi.hoisted(() => ({
  options: [] as MapOptions[],
  handlers: {} as Record<string, MapHandler[]>,
  eases: [] as EaseOptions[],
  paddings: [] as { bottom: number }[],
  fits: [] as { padding: { top: number; bottom: number } }[],
  zoom: 15,
  // An ease that has not ended yet; like MapLibre, stop() ends it and
  // emits its moveend, and so does any other camera call.
  easing: false,
  // prefers-reduced-motion: MapLibre ends an ease before easeTo returns.
  reducedMotion: false,
  // The furthest out the pan limit lets the viewport zoom.
  boundsMinZoom: 0,
  sources: {} as Record<string, { spec: SourceSpec; data: object[] }>,
  layers: [] as Layer[],
  filters: {} as Record<string, object>,
  visibility: {} as Record<string, string>,
  paints: [] as { layer: string; name: string; value: number }[],
  images: [] as { name: string; pixelRatio: number }[],
  hits: [] as Hit[],
  queries: [] as { box: number[][]; layers: string[] }[],
  expansionZoom: 17,
  // When set, a cluster's zoom is answered only when the test says so.
  holdExpansion: false,
  // The map has forgotten the cluster (a refresh replaced it).
  failExpansion: false,
  answerExpansion: [] as (() => void)[],
  // Names of pin images the browser fails to make.
  brokenArt: false,
  cursor: { cursor: '' },
  frames: [] as FrameRequestCallback[],
  prefersReducedMotion: false,
  motionListeners: 0,
  // Whether a pending pin is among what the map has drawn on the screen.
  pendingOnScreen: true,
  looks: [] as string[],
  moving: false,
  tilesLoaded: true,
}))

vi.mock('./attribution', () => ({ addAttribution: () => () => {} }))

vi.mock('./pinArt', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pinArt')>()),
  rasterisePin: () =>
    recorded.brokenArt
      ? Promise.reject(new Error('this browser cannot decode the artwork'))
      : Promise.resolve(document.createElement('img')),
}))

vi.mock('maplibre-gl', () => {
  const pinOnScreen = { geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }
  class Map {
    constructor(options: MapOptions) {
      recorded.options.push(options)
    }
    on(type: string, layerOrHandler: string | MapHandler, handler?: MapHandler) {
      const key = typeof layerOrHandler === 'string' ? `${type}:${layerOrHandler}` : type
      const fn = typeof layerOrHandler === 'string' ? handler : layerOrHandler
      if (fn) (recorded.handlers[key] ??= []).push(fn)
    }
    getZoom() {
      return recorded.zoom
    }
    getMinZoom() {
      return 0
    }
    getMaxZoom() {
      return 20
    }
    // As MapLibre: inside the zoom limits, and no further out than the pan
    // limit lets the viewport go.
    transform = {
      applyConstrain: (center: { lng: number; lat: number }, zoom: number) => ({
        center,
        zoom: Math.min(20, Math.max(zoom, 0, recorded.boundsMinZoom)),
      }),
    }
    getCenter() {
      return { lng: -3.71, lat: 40.411 }
    }
    fire(type: string) {
      ;(recorded.handlers[type] ?? []).forEach((handler) => handler({}))
    }
    stop() {
      if (!recorded.easing) return
      recorded.easing = false
      this.fire('moveend')
    }
    easeTo(options: EaseOptions) {
      this.stop()
      recorded.eases.push(options)
      recorded.easing = true
      if (recorded.reducedMotion) this.stop()
    }
    setPadding(padding: { bottom: number }) {
      this.stop()
      recorded.paddings.push(padding)
      this.fire('movestart')
      this.fire('moveend')
    }
    fitBounds(_bounds: number[][], options: { padding: { top: number; bottom: number } }) {
      this.stop()
      recorded.fits.push(options)
      this.fire('movestart')
      this.fire('moveend')
    }
    addSource(id: string, spec: SourceSpec) {
      recorded.sources[id] = { spec, data: [] }
    }
    getSource(id: string) {
      const found = recorded.sources[id]
      if (!found) return undefined
      return {
        setData: (data: object) => found.data.push(data),
        getClusterExpansionZoom: () =>
          new Promise<number>((resolve, reject) => {
            if (recorded.failExpansion) {
              reject(new Error('no such cluster'))
              return
            }
            const answer = () => resolve(recorded.expansionZoom)
            if (recorded.holdExpansion) recorded.answerExpansion.push(answer)
            else answer()
          }),
      }
    }
    addLayer(layer: Layer) {
      recorded.layers.push(layer)
      if (layer.filter) recorded.filters[layer.id] = layer.filter
    }
    setFilter(id: string, filter: object) {
      recorded.filters[id] = filter
    }
    setLayoutProperty(id: string, name: string, value: string) {
      if (name === 'visibility') recorded.visibility[id] = value
    }
    setPaintProperty(layer: string, name: string, value: number) {
      recorded.paints.push({ layer, name, value })
    }
    hasImage(name: string) {
      return recorded.images.some((image) => image.name === name)
    }
    addImage(name: string, _image: HTMLImageElement, options: { pixelRatio: number }) {
      recorded.images.push({ name, pixelRatio: options.pixelRatio })
    }
    isMoving() {
      return recorded.moving
    }
    areTilesLoaded() {
      return recorded.tilesLoaded
    }
    // With a box: what a tap hits. Without: what is drawn on the screen.
    queryRenderedFeatures(
      boxOrOptions: number[][] | { layers: string[] },
      options?: { layers: string[] },
    ) {
      if (!Array.isArray(boxOrOptions)) {
        recorded.looks.push(boxOrOptions.layers.join(','))
        return recorded.pendingOnScreen ? [pinOnScreen] : []
      }
      recorded.queries.push({ box: boxOrOptions, layers: options?.layers ?? [] })
      return recorded.hits
    }
    // A flat world, a hundred thousand pixels to the degree.
    project([lng, lat]: [number, number]) {
      return { x: (lng + 3.72) * 100_000, y: (40.42 - lat) * 100_000 }
    }
    getCanvas() {
      return { style: recorded.cursor }
    }
    remove() {}
  }
  return { default: { Map } }
})

const emit = (type: string, event: MapEvent = {}) => {
  if (type === 'moveend') {
    // An ease left to run arrives at its zoom; one ended by stop() does not.
    const landing = recorded.easing ? recorded.eases.at(-1)?.zoom : undefined
    if (landing !== undefined) recorded.zoom = landing
    recorded.easing = false
  }
  ;(recorded.handlers[type] ?? []).forEach((handler) => handler(event))
}
const userDrag = () => {
  emit('movestart', { originalEvent: new Event('touchstart') })
  emit('moveend')
}
const stored = () => localStorage.getItem('lis.map.view')
// What MapLibre does when a gesture takes over: the ease ends where it is.
const interrupt = () => {
  recorded.easing = false
  emit('moveend')
}
const screenPoint = (lng: number, lat: number) => ({
  x: (lng + 3.72) * 100_000,
  y: (40.42 - lat) * 100_000,
})
const tap = (lng: number, lat: number) => emit('click', { point: screenPoint(lng, lat) })
const pinHit = (id: string, lng: number, lat: number): Hit => ({
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { id },
})
const lastData = (source: string) => recorded.sources[source]?.data.at(-1)
/** The last opacity given to a layer's icons, if any. */
const opacityOf = (layer: string, name = 'icon-opacity') =>
  recorded.paints.findLast((p) => p.layer === layer && p.name === name)?.value
const coordinatesOf = (source: string, id: string) => {
  const data = lastData(source)
  if (!data || !('features' in data) || !Array.isArray(data.features)) return null
  const found = data.features.find((f: { properties: { id: string } }) => f.properties.id === id)
  return found ? (found.geometry.coordinates as [number, number]) : null
}
const ids = (source: string) => {
  const data = lastData(source)
  return data && 'features' in data && Array.isArray(data.features)
    ? data.features.map((f: { properties: { id: string } }) => f.properties.id)
    : null
}

const sighting = (
  id: string,
  status: MapSightingGeo['status'],
  lng = -3.71,
  lat = 40.411,
): MapSightingGeo => ({
  id,
  speciesId: 'candadin',
  lat,
  lng,
  status,
  verificationCount: status === 'approved' ? 3 : 0,
  createdAt: '2026-10-09T10:00:00.000Z',
})

// Each map listens to the document; they are destroyed after every test so
// one test's map does not answer another's events.
const mounted: BarrioMapController[] = []

function mount() {
  const calls = { picked: [] as string[], mapTaps: 0, userMoves: 0 }
  const controller = createBarrioMap(document.createElement('div'), {
    onPick: (id) => calls.picked.push(id),
    onMapTap: () => calls.mapTaps++,
    onUserMove: () => calls.userMoves++,
  })
  mounted.push(controller)
  return { controller, calls }
}

/** The style has loaded and the pin images are in: the sighting layers exist. */
async function mountReady() {
  const mounted = mount()
  emit('load')
  await vi.waitFor(() => expect(recorded.sources['sightings']).toBeDefined())
  return mounted
}

beforeEach(() => {
  localStorage.clear()
  recorded.options.length = 0
  recorded.eases.length = 0
  recorded.paddings.length = 0
  recorded.fits.length = 0
  recorded.zoom = 15
  recorded.easing = false
  recorded.reducedMotion = false
  recorded.boundsMinZoom = 0
  recorded.sources = {}
  recorded.layers.length = 0
  recorded.filters = {}
  recorded.visibility = {}
  recorded.paints.length = 0
  recorded.holdExpansion = false
  recorded.failExpansion = false
  recorded.answerExpansion.length = 0
  recorded.brokenArt = false
  recorded.motionListeners = 0
  recorded.pendingOnScreen = true
  recorded.looks.length = 0
  recorded.moving = false
  recorded.tilesLoaded = true
  recorded.images.length = 0
  recorded.hits = []
  recorded.queries.length = 0
  recorded.expansionZoom = 17
  recorded.cursor.cursor = ''
  recorded.frames.length = 0
  recorded.prefersReducedMotion = false
  for (const type of Object.keys(recorded.handlers)) delete recorded.handlers[type]
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    recorded.frames.push(callback),
  )
  vi.stubGlobal('cancelAnimationFrame', () => {
    recorded.frames.length = 0
  })
  vi.stubGlobal('matchMedia', () => ({
    matches: recorded.prefersReducedMotion,
    addEventListener: () => recorded.motionListeners++,
    removeEventListener: () => recorded.motionListeners--,
  }))
})

afterEach(() => {
  mounted.splice(0).forEach((controller) => controller.destroy())
  vi.unstubAllGlobals()
})

describe('createBarrioMap', () => {
  it('opens on the barrio and fits it once above the sheet', () => {
    const { controller } = mount()
    expect(recorded.options[0]?.bounds).toBeDefined()
    controller.setBottomPadding(300)
    controller.setBottomPadding(120)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([300, 120])
    expect(recorded.fits).toHaveLength(1)
    // the sheet is in the map's own padding; the fit only adds margins
    expect(recorded.paddings[0]?.bottom).toBe(300)
    expect(recorded.fits[0]?.padding.bottom).toBeLessThan(40)
  })

  it('waits for a measured sheet before fitting: zero is not a height', () => {
    const { controller } = mount()
    controller.setBottomPadding(0)
    expect(recorded.fits).toHaveLength(0)
    controller.setBottomPadding(310)
    expect(recorded.fits).toHaveLength(1)
    expect(recorded.paddings.at(-1)?.bottom).toBe(310)
  })

  it('never stores a view the user did not choose — the opening fit, a pin, following', () => {
    const { controller } = mount()
    controller.setBottomPadding(310)
    emit('moveend')
    controller.follow({ lat: 40.4115, lng: -3.712 }, 17)
    emit('movestart')
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).toBeNull()
  })

  it('a gesture that moved nothing does not make the next programmatic move look chosen', () => {
    const { controller } = mount()
    emit('wheel')
    controller.follow({ lat: 40.4115, lng: -3.712 }, 17)
    emit('moveend')
    expect(stored()).toBeNull()
  })

  it('a gesture that moved nothing does not make a sheet resize look chosen', () => {
    const { controller } = mount()
    controller.setBottomPadding(300)
    emit('wheel')
    controller.setBottomPadding(120)
    expect(stored()).toBeNull()
  })

  it("a zoom button pressed during a move to a pin is still the user's choice", () => {
    const { controller } = mount()
    controller.goTo({ lat: 40.4115, lng: -3.712 })
    controller.zoomBy(1)
    expect(stored()).toBeNull()
    emit('moveend')
    expect(stored()).not.toBeNull()
  })

  it("stores nothing while the neighbour's position is on the map", () => {
    const { controller } = mount()
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    controller.setMe(me)
    controller.follow(me, 17)
    emit('moveend')
    controller.zoomBy(1)
    emit('moveend')
    userDrag()
    emit('wheel')
    controller.setBottomPadding(200)
    expect(stored()).toBeNull()
  })

  it('still stores nothing after the position is gone: the map may be sitting on it', () => {
    const { controller } = mount()
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    controller.setMe(me)
    controller.follow(me, 17)
    emit('moveend')
    controller.setMe(null)
    controller.zoomBy(1)
    emit('moveend')
    userDrag()
    expect(stored()).toBeNull()
  })

  it('two sheet resizes during one move to a pin both send it again', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.goTo({ lat: 40.4115, lng: -3.712 })
    controller.setBottomPadding(200)
    controller.setBottomPadding(300)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([80])
    expect(recorded.eases.map((e) => e.padding?.bottom)).toEqual([80, 200, 300])
    expect(recorded.eases.at(-1)?.center).toEqual([-3.712, 40.4115])
  })

  it("with reduced motion a move ends at once, and the next drag is still the user's", () => {
    recorded.reducedMotion = true
    const { controller } = mount()
    controller.goTo({ lat: 40.4115, lng: -3.712 })
    expect(stored()).toBeNull()
    controller.setBottomPadding(300)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([300])
    userDrag()
    expect(stored()).not.toBeNull()
  })

  it('a resize of the map after a gesture that moved nothing stores nothing', () => {
    const { controller } = mount()
    controller.setBottomPadding(300)
    emit('wheel')
    controller.setBottomPadding(120)
    emit('movestart')
    emit('moveend')
    expect(stored()).toBeNull()
  })

  it('showing the position forgets an older stored view; without one, views are still stored', () => {
    const { controller } = mount()
    userDrag()
    controller.setMe(null)
    expect(stored()).not.toBeNull()
    controller.setMe({ lat: 40.4115, lng: -3.712, accuracyM: 12 })
    expect(stored()).toBeNull()
  })

  it('forgets the stored view once, not on every fix: another tab may store its own', () => {
    const { controller } = mount()
    controller.setMe({ lat: 40.4115, lng: -3.712, accuracyM: 12 })
    localStorage.setItem('lis.map.view', JSON.stringify({ center: [-3.71, 40.411], zoom: 15 }))
    controller.setMe({ lat: 40.4116, lng: -3.712, accuracyM: 12 })
    expect(stored()).not.toBeNull()
  })

  it('a sheet resize during a move to a pin sends the move again, with the new padding', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.goTo({ lat: 40.4115, lng: -3.712 })
    controller.setBottomPadding(300)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([80])
    expect(recorded.eases.at(-1)).toMatchObject({
      center: [-3.712, 40.4115],
      padding: { bottom: 300 },
    })
    emit('moveend')
    controller.setBottomPadding(120)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([80, 120])
    expect(stored()).toBeNull()
  })

  it('a gesture landing in the middle of a programmatic move does not store that move', () => {
    const { controller } = mount()
    controller.follow({ lat: 40.4115, lng: -3.712 }, 17)
    emit('wheel')
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).toBeNull()
    emit('movestart', { originalEvent: new Event('touchstart') })
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).not.toBeNull()
  })

  it('stores a view once per user move, including the zoom buttons', () => {
    const { controller } = mount()
    emit('movestart', { originalEvent: new Event('touchstart') })
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).not.toBeNull()
    localStorage.clear()
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).toBeNull()
    controller.zoomBy(1)
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).not.toBeNull()
  })

  it('remembers the view and restores it without refitting', () => {
    mount()
    emit('movestart', { originalEvent: new Event('touchstart') })
    emit('moveend')
    const { controller } = mount()
    expect(recorded.options[1]).toMatchObject({ center: [-3.71, 40.411], zoom: 15 })
    controller.setBottomPadding(300)
    expect(recorded.fits).toHaveLength(0)
  })

  it('ignores a remembered view outside the barrio', () => {
    localStorage.setItem('lis.map.view', JSON.stringify({ center: [2.17, 41.38], zoom: 12 }))
    mount()
    expect(recorded.options[0]?.center).toBeUndefined()
    expect(recorded.options[0]?.bounds).toBeDefined()
  })

  it('a recentre during a zoom-in keeps the zoom; after it has landed, it does not zoom', () => {
    const { controller } = mount()
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    controller.follow({ lat: 40.4111, lng: -3.71 })
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.4111], zoom: 17 })
    emit('moveend')
    controller.follow({ lat: 40.4112, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })

  it('a pin picked during a zoom-in, then a sheet resize, still keeps the zoom it found', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    controller.goTo({ lat: 40.4125, lng: -3.7135 })
    controller.setBottomPadding(300)
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
    controller.follow({ lat: 40.4111, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })

  it('a recentre after the user took over the map does not resume the zoom-in', () => {
    const { controller } = mount()
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    userDrag()
    controller.follow({ lat: 40.4111, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })

  it('a pin picked during the zoom-in to the position keeps the zoom it finds', () => {
    const { controller } = mount()
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    controller.goTo({ lat: 40.4125, lng: -3.7135 })
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.7135, 40.4125] })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })

  it('a recentre during a zoom-button step lets the step finish', () => {
    const { controller } = mount()
    controller.zoomBy(1)
    controller.follow({ lat: 40.4111, lng: -3.71 })
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.4111], zoom: 16 })
    controller.follow({ lat: 40.4112, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBe(16)
    emit('moveend')
    controller.follow({ lat: 40.4113, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })

  it('a zoom-button step pressed during the zoom-in to the position is carried on by the next fix', () => {
    const { controller } = mount()
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    controller.zoomBy(1)
    controller.follow({ lat: 40.4111, lng: -3.71 })
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.4111], zoom: 16 })
  })

  it('with reduced motion a zoom step has landed before the next fix: nothing to carry', () => {
    recorded.reducedMotion = true
    const { controller } = mount()
    controller.zoomBy(1)
    controller.follow({ lat: 40.4111, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
    controller.follow({ lat: 40.4112, lng: -3.71 }, 17)
    controller.follow({ lat: 40.4113, lng: -3.71 })
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })

  it('a tap on locate during a zoom step ends at least at street level, and never cuts a step beyond it', () => {
    const { controller } = mount()
    recorded.zoom = 17.5
    controller.zoomBy(-1)
    recorded.zoom = 17.2
    controller.follow({ lat: 40.4111, lng: -3.71 }, 17)
    expect(recorded.eases.at(-1)?.zoom).toBe(17)
    emit('moveend')
    recorded.zoom = 16.5
    controller.zoomBy(1)
    recorded.zoom = 16.8
    controller.follow({ lat: 40.4112, lng: -3.71 }, 17)
    expect(recorded.eases.at(-1)?.zoom).toBe(17.5)
  })

  it('a sheet resize during a zoom-button step lets the step finish, in both directions', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.zoomBy(1)
    controller.setBottomPadding(300)
    expect(recorded.paddings.at(-1)?.bottom).toBe(300)
    expect(recorded.eases.at(-1)?.zoom).toBe(16)
    // the step was stopped part-way: that zoom is not the user's view
    expect(stored()).toBeNull()
    emit('moveend')
    expect(stored()).not.toBeNull()
    controller.zoomBy(-1)
    controller.setBottomPadding(120)
    expect(recorded.eases.at(-1)?.zoom).toBe(15)
    emit('moveend')
    controller.setBottomPadding(200)
    expect(recorded.eases).toHaveLength(4)
  })

  it('a sheet resize during the zoom-in to the position re-sends that move, not a zoom step', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.follow({ lat: 40.4111, lng: -3.71 }, 17)
    controller.setBottomPadding(300)
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.4111], zoom: 17 })
    emit('moveend')
    expect(stored()).toBeNull()
  })

  it('a zoom step cut by a move to a pin, or by a second press, does not store its half-made zoom', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.zoomBy(1)
    controller.goTo({ lat: 40.4125, lng: -3.7135 })
    emit('moveend')
    expect(stored()).toBeNull()
    controller.zoomBy(1)
    controller.zoomBy(1)
    expect(stored()).toBeNull()
    emit('moveend')
    expect(stored()).not.toBeNull()
  })

  it('a zoom step that ends at the zoom limit still counts as arrived', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    recorded.zoom = 19.6
    controller.zoomBy(1)
    expect(recorded.eases.at(-1)?.zoom).toBe(20)
    emit('moveend')
    expect(stored()).not.toBeNull()
  })

  it('a zoom-out step that the pan limit stops short still counts as arrived', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    recorded.boundsMinZoom = 14.4
    controller.zoomBy(-1)
    expect(recorded.eases.at(-1)?.zoom).toBe(14.4)
    emit('moveend')
    expect(stored()).not.toBeNull()
  })

  it('a zoom-out step at the lowest zoom still counts as arrived', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    recorded.zoom = 0.4
    controller.zoomBy(-1)
    expect(recorded.eases.at(-1)?.zoom).toBe(0)
    emit('moveend')
    expect(stored()).not.toBeNull()
  })

  it('a zoom-out step that is cut stores nothing either, however close it got', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.zoomBy(-1)
    recorded.zoom = 14.3
    interrupt()
    expect(stored()).toBeNull()
  })

  it('a drag that takes over a zoom step stores the drag, not the half-made zoom', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.zoomBy(1)
    interrupt()
    expect(stored()).toBeNull()
    userDrag()
    expect(stored()).not.toBeNull()
  })

  it('the wheel taking over a zoom step stores the wheel zoom, not the half-made one', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.zoomBy(1)
    emit('wheel')
    interrupt()
    expect(stored()).toBeNull()
    emit('moveend')
    expect(stored()).not.toBeNull()
  })

  it('a sheet resize that cuts the glide of a user drag still stores where it stopped', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    emit('movestart', { originalEvent: new Event('touchstart') })
    recorded.easing = true
    controller.setBottomPadding(120)
    expect(stored()).not.toBeNull()
  })

  it('the opening fit replaces a move started before the sheet was measured', () => {
    const { controller } = mount()
    controller.goTo({ lat: 40.4125, lng: -3.7135 })
    controller.setBottomPadding(300)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([300])
    expect(recorded.fits).toHaveLength(1)
    expect(recorded.eases).toHaveLength(1)
    emit('moveend')
    expect(stored()).toBeNull()
  })

  it('the opening fit wins over a zoom step pressed before the sheet was measured', () => {
    const { controller } = mount()
    controller.zoomBy(1)
    controller.zoomBy(1)
    controller.setBottomPadding(300)
    expect(recorded.fits).toHaveLength(1)
    expect(recorded.eases).toHaveLength(2)
    expect(stored()).toBeNull()
  })

  it('a zoom-out step is carried on too, and a sheet resize keeps it', () => {
    const { controller } = mount()
    controller.setBottomPadding(80)
    controller.zoomBy(-1)
    controller.follow({ lat: 40.4111, lng: -3.71 })
    controller.setBottomPadding(300)
    controller.follow({ lat: 40.4112, lng: -3.71 })
    expect(recorded.eases.at(-1)).toMatchObject({ zoom: 14, padding: { bottom: 300 } })
  })

  it('following zooms in only when the map is further out than asked', () => {
    const { controller } = mount()
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.411], zoom: 17 })
    emit('moveend')
    recorded.zoom = 18
    controller.follow({ lat: 40.411, lng: -3.71 }, 17)
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
  })
  describe('sightings on the map (LCHP-35)', () => {
    const three = [
      sighting('a', 'approved', -3.71, 40.411),
      sighting('b', 'pending', -3.711, 40.412),
      sighting('c', 'approved', -3.712, 40.413),
    ]

    it('draws them from map sources, not page elements, once the pin images exist', async () => {
      const { controller } = mount()
      controller.setSightings(three)
      expect(recorded.sources['sightings']).toBeUndefined()
      emit('load')
      await vi.waitFor(() => expect(ids('sightings')).toEqual(['a', 'b', 'c']))
      expect(recorded.sources['sightings']?.spec).toMatchObject({
        cluster: true,
        clusterMaxZoom: 17,
        clusterProperties: { pending: expect.anything() },
      })
      // the heat map counts every sighting; a validated one weighs more
      expect(ids('sightings-heat')).toEqual(['a', 'b', 'c'])
      expect(recorded.sources['sightings-heat']?.spec.cluster).toBeUndefined()
      const heat = recorded.layers.find((layer) => layer.id === 'sighting-heat')
      expect(JSON.stringify(heat?.paint?.['heatmap-weight'])).toBe(
        '["case",["==",["get","status"],"approved"],1,0.4]',
      )
      expect(HEAT_WEIGHT.approved).toBeGreaterThan(HEAT_WEIGHT.pending)
      expect(lastData('sightings')).toMatchObject({
        features: [
          {
            geometry: { type: 'Point', coordinates: [-3.71, 40.411] },
            properties: { id: 'a', species: 'candadin', status: 'approved' },
          },
          { properties: { id: 'b', status: 'pending' } },
          { properties: { id: 'c' } },
        ],
      })
      expect(document.querySelector('.maplibregl-marker')).toBeNull()
    })

    it('registers one image per creature and state before any pin layer', async () => {
      await mountReady()
      expect(recorded.images).toHaveLength(12)
      expect(recorded.images.map((image) => image.name)).toContain('pin-keymon-pending')
      expect(new Set(recorded.images.map((image) => image.pixelRatio)).size).toBe(1)
    })

    it('stacks the layers: the position under the pins, the picked pin on top', async () => {
      await mountReady()
      expect(recorded.layers.map((layer) => layer.id)).toEqual([
        'me-accuracy',
        'me-halo',
        'me-dot',
        'sighting-heat',
        'sighting-clusters',
        'sighting-cluster-count',
        'sighting-points',
        'sighting-pending',
        'sighting-selected',
      ])
    })

    it('draws the picked sighting on its own, so a cluster cannot hide it', async () => {
      const { controller } = await mountReady()
      controller.setSightings(three)
      expect(ids('sighting-selected')).toEqual([])
      controller.setSelected('b')
      expect(ids('sighting-selected')).toEqual(['b'])
      expect(JSON.stringify(recorded.filters['sighting-pending'])).toContain(
        '["!=",["get","id"],"b"]',
      )
      expect(JSON.stringify(recorded.filters['sighting-points'])).toContain(
        '["!=",["get","id"],"b"]',
      )
      controller.setSelected(null)
      expect(ids('sighting-selected')).toEqual([])
      expect(JSON.stringify(recorded.filters['sighting-pending'])).toContain(
        '["!=",["get","id"],""]',
      )
    })

    it('keeps the picked sighting drawn when the list is refreshed, and drops it when it is gone', async () => {
      const { controller } = await mountReady()
      controller.setSelected('c')
      controller.setSightings(three)
      expect(ids('sighting-selected')).toEqual(['c'])
      controller.setSightings(three.slice(0, 2))
      expect(ids('sighting-selected')).toEqual([])
    })

    it('a tap picks the nearest pin within reach, and only that', async () => {
      const { calls } = await mountReady()
      recorded.hits = [pinHit('far', -3.7102, 40.411), pinHit('near', -3.71001, 40.411)]
      tap(-3.71, 40.411)
      expect(calls.picked).toEqual(['near'])
      expect(calls.mapTaps).toBe(0)
      // a finger's reach around the tap: 14 px each way
      const [[left, top], [right, bottom]] = recorded.queries.at(-1)?.box ?? [[], []]
      expect([right - left, bottom - top]).toEqual([28, 28])
      expect(recorded.queries.at(-1)?.layers).toEqual([
        'sighting-selected',
        'sighting-pending',
        'sighting-points',
        'sighting-clusters',
      ])
    })

    it('a tap on nothing is a tap on the map', async () => {
      const { calls } = await mountReady()
      tap(-3.71, 40.411)
      expect(calls.mapTaps).toBe(1)
      expect(calls.picked).toEqual([])
    })

    it("a tap on a cluster zooms until its pins come apart, as the user's own move", async () => {
      const { calls } = await mountReady()
      recorded.hits = [
        {
          geometry: { type: 'Point', coordinates: [-3.711, 40.412] },
          properties: { cluster_id: 9 },
        },
      ]
      tap(-3.711, 40.412)
      await vi.waitFor(() => expect(recorded.eases).toHaveLength(1))
      expect(recorded.eases[0]).toMatchObject({ center: [-3.711, 40.412], zoom: 17 })
      expect(calls.userMoves).toBe(1)
      expect(calls.picked).toEqual([])
      expect(calls.mapTaps).toBe(0)
      emit('moveend')
      expect(stored()).not.toBeNull()
    })

    it('a sheet resize while a cluster opens sends the move again, centre included', async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      recorded.hits = [
        {
          geometry: { type: 'Point', coordinates: [-3.711, 40.412] },
          properties: { cluster_id: 9 },
        },
      ]
      tap(-3.711, 40.412)
      await vi.waitFor(() => expect(recorded.eases).toHaveLength(1))
      controller.setBottomPadding(300)
      expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.711, 40.412], zoom: 17 })
      expect(stored()).toBeNull()
    })

    it('shows a pointer over what can be tapped', async () => {
      await mountReady()
      emit('mouseenter:sighting-points')
      expect(recorded.cursor.cursor).toBe('pointer')
      emit('mouseleave:sighting-points')
      expect(recorded.cursor.cursor).toBe('')
    })

    it('the heat map replaces the pins, and taps then reach only the map', async () => {
      const { controller, calls } = await mountReady()
      controller.setSightings(three)
      controller.setHeat(true)
      expect(recorded.visibility['sighting-heat']).toBe('visible')
      for (const id of [
        'sighting-clusters',
        'sighting-cluster-count',
        'sighting-points',
        'sighting-pending',
        'sighting-selected',
      ]) {
        expect(recorded.visibility[id]).toBe('none')
      }
      recorded.hits = [pinHit('a', -3.71, 40.411)]
      const queries = recorded.queries.length
      tap(-3.71, 40.411)
      expect(recorded.queries).toHaveLength(queries)
      expect(calls.mapTaps).toBe(1)
      controller.setHeat(false)
      expect(recorded.visibility['sighting-heat']).toBe('none')
      expect(recorded.visibility['sighting-points']).toBe('visible')
    })

    it('a heat map asked for before the layers exist is applied when they do', async () => {
      const { controller } = mount()
      controller.setHeat(true)
      emit('load')
      await vi.waitFor(() => expect(recorded.visibility['sighting-heat']).toBe('visible'))
    })

    it("draws the neighbour's position as map layers once the style has loaded", async () => {
      const { controller } = mount()
      controller.setMe({ lat: 40.4115, lng: -3.712, accuracyM: 12 })
      expect(recorded.sources['me-point']).toBeUndefined()
      emit('load')
      expect(lastData('me-point')).toMatchObject({ geometry: { coordinates: [-3.712, 40.4115] } })
      expect(lastData('me')).toMatchObject({ type: 'Feature' })
      controller.setMe(null)
      expect(lastData('me-point')).toMatchObject({ type: 'FeatureCollection' })
      expect(lastData('me')).toMatchObject({ type: 'FeatureCollection' })
    })
  })

  describe('what can go wrong around the pins', () => {
    const cluster = (id: number): Hit => ({
      geometry: { type: 'Point', coordinates: [-3.711, 40.412] },
      properties: { cluster_id: id },
    })

    it('sightings on the same public coordinate are drawn apart, so each can be reached', async () => {
      const { controller, calls } = await mountReady()
      const twins = [sighting('m', 'approved'), sighting('n', 'approved'), sighting('o', 'pending')]
      controller.setSightings(twins)
      const spots = ['m', 'n', 'o'].map((id) => coordinatesOf('sightings', id)?.join(','))
      expect(new Set(spots).size).toBe(3)
      // the heat map still piles them on their true, shared coordinate
      expect(coordinatesOf('sightings-heat', 'm')).toEqual([-3.71, 40.411])
      expect(coordinatesOf('sightings-heat', 'n')).toEqual([-3.71, 40.411])

      const [nLng, nLat] = coordinatesOf('sightings', 'n') ?? [0, 0]
      const [mLng, mLat] = coordinatesOf('sightings', 'm') ?? [0, 0]
      recorded.hits = [pinHit('m', mLng, mLat), pinHit('n', nLng, nLat)]
      tap(nLng, nLat)
      tap(mLng, mLat)
      expect(calls.picked).toEqual(['n', 'm'])

      controller.setSelected('n')
      expect(coordinatesOf('sighting-selected', 'n')).toEqual([nLng, nLat])
    })

    it('a browser that cannot make the pin images gets the same pins as dots', async () => {
      recorded.brokenArt = true
      const { controller, calls } = await mountReady()
      controller.setSightings([sighting('a', 'approved'), sighting('p', 'pending', -3.712)])
      expect(recorded.images).toHaveLength(0)
      expect(['sighting-points', 'sighting-pending', 'sighting-selected'].map(typeOf)).toEqual([
        'circle',
        'circle',
        'circle',
      ])
      expect(ids('sightings')).toEqual(['a', 'p'])

      recorded.hits = [pinHit('a', -3.71, 40.411)]
      tap(-3.71, 40.411)
      expect(calls.picked).toEqual(['a'])

      // the picked one is marked, and a pending one still blinks
      controller.setSelected('p')
      expect(ids('sighting-selected')).toEqual(['p'])
      recorded.frames.at(-1)?.(2100)
      expect(opacityOf('sighting-pending', 'circle-opacity')).toBeCloseTo(0.25)
      expect(opacityOf('sighting-selected', 'circle-opacity')).toBeCloseTo(0.25)
      expect(opacityOf('sighting-pending')).toBeUndefined()

      controller.setHeat(true)
      expect(recorded.visibility['sighting-points']).toBe('none')
    })

    it('draws the pins as images when the images exist', async () => {
      await mountReady()
      expect(['sighting-points', 'sighting-pending', 'sighting-selected'].map(typeOf)).toEqual([
        'symbol',
        'symbol',
        'symbol',
      ])
    })

    it('a cluster that answers late does not override what the user did meanwhile', async () => {
      const { controller, calls } = await mountReady()
      recorded.holdExpansion = true
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      userDrag()
      recorded.answerExpansion.splice(0).forEach((answer) => answer())
      await Promise.resolve()
      await Promise.resolve()
      expect(recorded.eases).toHaveLength(0)
      expect(calls.userMoves).toBe(1)

      tap(-3.711, 40.412)
      controller.setHeat(true)
      recorded.answerExpansion.splice(0).forEach((answer) => answer())
      await Promise.resolve()
      await Promise.resolve()
      expect(recorded.eases).toHaveLength(0)

      controller.setHeat(false)
      tap(-3.711, 40.412)
      recorded.answerExpansion.splice(0).forEach((answer) => answer())
      await vi.waitFor(() => expect(recorded.eases).toHaveLength(1))
    })

    it('a later tap, a picked pin, a zoom button or fresh sightings also win over a late cluster', async () => {
      const { controller, calls } = await mountReady()
      controller.setBottomPadding(80)
      recorded.holdExpansion = true
      const late = async () => {
        recorded.answerExpansion.splice(0).forEach((answer) => answer())
        await Promise.resolve()
        await Promise.resolve()
      }
      const before = () => recorded.eases.length

      // another tap, on a pin
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      recorded.hits = [pinHit('a', -3.71, 40.411)]
      tap(-3.71, 40.411)
      let eases = before()
      await late()
      expect(recorded.eases).toHaveLength(eases)
      expect(calls.picked).toEqual(['a'])

      // a pin picked from the list
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      controller.goTo({ lat: 40.4125, lng: -3.7135 })
      eases = before()
      await late()
      expect(recorded.eases).toHaveLength(eases)
      expect(recorded.eases.at(-1)?.zoom).toBeUndefined()

      // a zoom button
      emit('moveend')
      tap(-3.711, 40.412)
      controller.zoomBy(1)
      eases = before()
      await late()
      expect(recorded.eases).toHaveLength(eases)
      expect(recorded.eases.at(-1)?.center).toBeUndefined()

      // the sightings were refreshed: the cluster may be another one now
      emit('moveend')
      tap(-3.711, 40.412)
      controller.setSightings([sighting('a', 'approved')])
      eases = before()
      await late()
      expect(recorded.eases).toHaveLength(eases)
    })

    it('a tap on the locate button wins over a cluster still opening; a position update does not', async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      recorded.holdExpansion = true
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      controller.follow({ lat: 40.4111, lng: -3.71 }, 17)
      recorded.answerExpansion.splice(0).forEach((answer) => answer())
      await Promise.resolve()
      await Promise.resolve()
      expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.4111], zoom: 17 })
      expect(recorded.eases).toHaveLength(1)
    })

    it('a sheet resize re-sending a zoom step does not cancel a cluster that is opening', async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      controller.zoomBy(1)
      recorded.holdExpansion = true
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      controller.setBottomPadding(300)
      recorded.answerExpansion.splice(0).forEach((answer) => answer())
      await vi.waitFor(() =>
        expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.711, 40.412], zoom: 17 }),
      )
    })

    it('the camera stays with a picked pin when a refresh moves where it is drawn', async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      const alone = [sighting('n', 'approved')]
      controller.setSightings(alone)
      controller.setSelected('n')
      controller.goTo({ id: 'n', lat: 40.411, lng: -3.71 })
      emit('moveend')
      const before = recorded.eases.length

      // the same sightings again: nothing moved, nothing to do
      controller.setSightings([...alone])
      expect(recorded.eases).toHaveLength(before)

      // a cell-mate arrives: 'n' moves onto the ring, and the camera with it
      controller.setSightings([sighting('m', 'approved'), ...alone])
      const [lng, lat] = coordinatesOf('sightings', 'n') ?? [0, 0]
      expect([lng, lat]).not.toEqual([-3.71, 40.411])
      expect(recorded.eases.at(-1)?.center).toEqual([lng, lat])
      emit('moveend')
      expect(stored()).toBeNull()

      // once the neighbour has moved the map, it is theirs
      userDrag()
      const after = recorded.eases.length
      controller.setSightings(alone)
      expect(recorded.eases).toHaveLength(after)
    })

    it("the app's own re-sends do not cancel a cluster that is opening", async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      recorded.holdExpansion = true
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      controller.setBottomPadding(300)
      controller.follow({ lat: 40.4111, lng: -3.71 })
      recorded.answerExpansion.splice(0).forEach((answer) => answer())
      await vi.waitFor(() =>
        expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.711, 40.412], zoom: 17 }),
      )
    })

    it('a cluster the map no longer knows is a lost tap, not an error', async () => {
      const { calls } = await mountReady()
      recorded.failExpansion = true
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(recorded.eases).toHaveLength(0)
      expect(calls.userMoves).toBe(0)
    })

    it('goes to where a sighting is drawn, not to the point it shares', async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      controller.setSightings([sighting('m', 'approved'), sighting('n', 'approved')])
      const [lng, lat] = coordinatesOf('sightings', 'n') ?? [0, 0]
      expect([lng, lat]).not.toEqual([-3.71, 40.411])
      controller.goTo({ id: 'n', lat: 40.411, lng: -3.71 })
      expect(recorded.eases.at(-1)?.center).toEqual([lng, lat])
      controller.goTo({ id: 'gone', lat: 40.411, lng: -3.71 })
      expect(recorded.eases.at(-1)?.center).toEqual([-3.71, 40.411])
    })

    it('a zoom button pressed while a cluster opens keeps heading for the cluster', async () => {
      const { controller } = await mountReady()
      controller.setBottomPadding(80)
      recorded.hits = [cluster(9)]
      tap(-3.711, 40.412)
      await vi.waitFor(() => expect(recorded.eases).toHaveLength(1))
      controller.zoomBy(1)
      expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.711, 40.412], zoom: 18 })
    })

    it('a map destroyed while its images are being made adds nothing afterwards', async () => {
      const { controller } = mount()
      emit('load')
      controller.destroy()
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(recorded.sources['sightings']).toBeUndefined()
      expect(recorded.images).toHaveLength(0)
    })

    it('a tap before the pins exist is a tap on the map', () => {
      const { calls } = mount()
      recorded.hits = [pinHit('a', -3.71, 40.411)]
      tap(-3.71, 40.411)
      expect(recorded.queries).toHaveLength(0)
      expect(calls.mapTaps).toBe(1)
    })

    it('makes the images at a whole number of device pixels, three at most', async () => {
      vi.stubGlobal('devicePixelRatio', 2.6)
      await mountReady()
      expect(new Set(recorded.images.map((image) => image.pixelRatio))).toEqual(new Set([3]))
      recorded.images.length = 0
      recorded.sources = {}
      vi.stubGlobal('devicePixelRatio', 5)
      await mountReady()
      expect(new Set(recorded.images.map((image) => image.pixelRatio))).toEqual(new Set([3]))
    })
  })

  describe('the pending blink', () => {
    const pending = [sighting('p', 'pending'), sighting('a', 'approved')]
    const frame = (now: number) => recorded.frames.at(-1)?.(now)

    it("fades the pending pins on the page's clock, at most twenty times a second", async () => {
      const { controller } = await mountReady()
      controller.setSightings(pending)
      expect(recorded.frames).toHaveLength(1)
      recorded.paints.length = 0
      frame(1400)
      expect(opacityOf('sighting-pending')).toBeCloseTo(1)
      frame(1420)
      expect(recorded.paints).toHaveLength(1)
      frame(2100)
      expect(opacityOf('sighting-pending')).toBeCloseTo(0.25)
      // validated pins never fade
      expect(opacityOf('sighting-points')).toBeUndefined()
    })

    it('a picked pending pin keeps blinking, as its card says; a picked validated one stays solid', async () => {
      const { controller } = await mountReady()
      controller.setSightings(pending)
      controller.setSelected('p')
      frame(2100)
      expect(opacityOf('sighting-selected')).toBeCloseTo(0.25)
      controller.setSelected('a')
      expect(opacityOf('sighting-selected')).toBe(1)
      frame(2800)
      frame(3500)
      expect(opacityOf('sighting-selected')).toBe(1)
      expect(opacityOf('sighting-pending')).toBeCloseTo(0.25)
    })

    it('does not run without pending sightings', async () => {
      const { controller } = await mountReady()
      controller.setSightings([sighting('a', 'approved')])
      expect(recorded.frames).toHaveLength(0)
    })

    it('stops, fully visible, in heat mode, in a hidden tab, and when destroyed', async () => {
      const { controller } = await mountReady()
      controller.setSightings(pending)
      frame(2100)
      controller.setHeat(true)
      expect(recorded.frames).toHaveLength(0)
      expect(opacityOf('sighting-pending')).toBe(1)
      expect(opacityOf('sighting-selected')).toBe(1)
      controller.setHeat(false)
      expect(recorded.frames).toHaveLength(1)

      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
      expect(recorded.frames).toHaveLength(0)
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
      document.dispatchEvent(new Event('visibilitychange'))
      expect(recorded.frames).toHaveLength(1)

      expect(recorded.motionListeners).toBe(1)
      controller.destroy()
      expect(recorded.frames).toHaveLength(0)
      expect(recorded.motionListeners).toBe(0)
      vi.restoreAllMocks()
    })

    it('rests while no pending pin is on the screen, and picks up when one comes back', async () => {
      const { controller } = await mountReady()
      controller.setSightings(pending)
      expect(recorded.frames).toHaveLength(1)

      // the neighbour pans away from every pending pin
      recorded.pendingOnScreen = false
      userDrag()
      emit('idle')
      expect(recorded.frames).toHaveLength(0)
      expect(opacityOf('sighting-pending')).toBe(1)

      // nothing changed: the map is not asked again and again while it rests
      recorded.looks.length = 0
      emit('idle')
      expect(recorded.looks.length).toBeLessThanOrEqual(2)
      expect(recorded.frames).toHaveLength(0)

      recorded.pendingOnScreen = true
      userDrag()
      emit('idle')
      expect(recorded.frames).toHaveLength(1)
    })

    it('finds out by itself that the pending pins left the screen: a blinking map is never idle', async () => {
      const { controller } = await mountReady()
      controller.setSightings(pending)
      recorded.pendingOnScreen = false
      userDrag()
      const moved = performance.now()

      // too soon: the map has not placed the pins of the new view yet
      frame(moved + 100)
      expect(recorded.frames.length).toBeGreaterThan(0)

      // still loading, or still moving: not yet either
      recorded.tilesLoaded = false
      frame(moved + 500)
      recorded.tilesLoaded = true
      recorded.moving = true
      frame(moved + 600)
      expect(recorded.frames.length).toBeGreaterThan(0)

      recorded.moving = false
      frame(moved + 700)
      expect(recorded.frames).toHaveLength(0)
      expect(opacityOf('sighting-pending')).toBe(1)
    })

    it('does not look at the screen on every repaint while it blinks', async () => {
      const { controller } = await mountReady()
      controller.setSightings(pending)
      emit('idle')
      recorded.looks.length = 0
      frame(2100)
      emit('idle')
      frame(2200)
      emit('idle')
      expect(recorded.looks).toHaveLength(0)
    })

    it('never starts for someone who asked for less motion', async () => {
      recorded.prefersReducedMotion = true
      const { controller } = await mountReady()
      controller.setSightings(pending)
      expect(recorded.frames).toHaveLength(0)
      expect(opacityOf('sighting-pending')).toBeUndefined()
    })
  })

  describe('leftovers of the LCHP-34 review (LCHP-38)', () => {
    it('a second press of a zoom button adds to where the first was heading', () => {
      const { controller } = mount()
      controller.setBottomPadding(80)
      controller.zoomBy(1)
      controller.zoomBy(1)
      expect(recorded.eases.map((e) => e.zoom)).toEqual([16, 17])
      emit('moveend')
      controller.zoomBy(-1)
      expect(recorded.eases.at(-1)?.zoom).toBe(16)
    })

    it("a step that the window's own resize moved the limit for still counts as arrived", () => {
      const { controller } = mount()
      controller.setBottomPadding(80)
      recorded.boundsMinZoom = 14.4
      controller.zoomBy(-1)
      expect(recorded.eases.at(-1)?.zoom).toBe(14.4)
      // the window grows on the way: the map can no longer go that far out
      recorded.boundsMinZoom = 14.6
      recorded.zoom = 14.6
      interrupt()
      expect(stored()).not.toBeNull()
    })

    it('a zoom-in to the position cut by a gesture leaves the next drag to be stored', () => {
      const { controller } = mount()
      controller.setBottomPadding(80)
      controller.follow({ lat: 40.4111, lng: -3.71 }, 17)
      recorded.zoom = 15.6
      interrupt()
      expect(stored()).toBeNull()
      userDrag()
      expect(stored()).not.toBeNull()
    })
  })
})

describe('fanOut', () => {
  const at = (id: string, lng = -3.71, lat = 40.411) => ({ id, lng, lat })
  const metresApart = (a: { lng: number; lat: number }, b: { lng: number; lat: number }) =>
    Math.hypot(
      (a.lat - b.lat) * 111_320,
      (a.lng - b.lng) * 111_320 * Math.cos((40.411 * Math.PI) / 180),
    )

  it('leaves a sighting alone on its coordinate where it is', () => {
    const apart = [at('a'), at('b', -3.72), at('c', -3.71, 40.412)]
    expect(fanOut(apart)).toEqual(apart)
  })

  it('sets sightings that share a coordinate on a ring around it, ten metres out', () => {
    const [a, b, c] = fanOut([at('a'), at('b'), at('c')])
    for (const spot of [a, b, c]) expect(metresApart(spot, at('x'))).toBeCloseTo(10, 1)
    expect(metresApart(a, b)).toBeGreaterThan(9)
    expect(metresApart(b, c)).toBeGreaterThan(9)
    expect(metresApart(a, c)).toBeGreaterThan(9)
  })

  it('keeps each one on its spot whatever order they arrive in', () => {
    const one = fanOut([at('a'), at('b'), at('c')])
    const other = fanOut([at('c'), at('a'), at('b')])
    for (const spot of one) expect(other.find((o) => o.id === spot.id)).toEqual(spot)
  })

  it('opens a second ring after six, and never puts two on one spot', () => {
    const many = fanOut(Array.from({ length: 20 }, (_, i) => at(`s${String(i).padStart(2, '0')}`)))
    const distances = many.map((spot) => Math.round(metresApart(spot, at('x'))))
    expect(distances.filter((d) => d === 10)).toHaveLength(6)
    expect(distances.filter((d) => d === 20)).toHaveLength(12)
    expect(distances.filter((d) => d === 30)).toHaveLength(2)
    expect(new Set(many.map((spot) => `${spot.lng},${spot.lat}`)).size).toBe(20)
  })
})

describe('circlePolygon', () => {
  it('closes the ring and keeps every point at the radius', () => {
    const ring = circlePolygon({ lat: 40.411, lng: -3.71 }, 50, 16)
    expect(ring).toHaveLength(17)
    expect(ring[0]).toEqual(ring[16])
    for (const [lng, lat] of ring) {
      const dy = (lat - 40.411) * 111_320
      const dx = (lng + 3.71) * 111_320 * Math.cos((40.411 * Math.PI) / 180)
      expect(Math.hypot(dx, dy)).toBeCloseTo(50, 0)
    }
  })
})
