import { circlePolygon, createBarrioMap, type MarkerMount } from './createBarrioMap'

type MapHandler = (event: { originalEvent?: Event }) => void
type EaseOptions = { center?: [number, number]; zoom?: number }
type MapOptions = { center?: [number, number]; zoom?: number; bounds?: number[][] }

const recorded = vi.hoisted(() => ({
  options: [] as MapOptions[],
  handlers: {} as Record<string, MapHandler[]>,
  eases: [] as EaseOptions[],
  paddings: [] as { bottom: number }[],
  fits: [] as { padding: { top: number; bottom: number } }[],
  zoom: 15,
}))

vi.mock('./attribution', () => ({ addAttribution: () => () => {} }))

vi.mock('maplibre-gl', () => {
  class Marker {
    element: HTMLElement
    constructor(options: { element: HTMLElement }) {
      this.element = options.element
    }
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    remove() {}
    getElement() {
      return this.element
    }
  }
  class Map {
    constructor(options: MapOptions) {
      recorded.options.push(options)
    }
    on(type: string, handler: MapHandler) {
      ;(recorded.handlers[type] ??= []).push(handler)
    }
    getZoom() {
      return recorded.zoom
    }
    getCenter() {
      return { lng: -3.71, lat: 40.411 }
    }
    easeTo(options: EaseOptions) {
      recorded.eases.push(options)
    }
    setPadding(padding: { bottom: number }) {
      recorded.paddings.push(padding)
    }
    fitBounds(_bounds: number[][], options: { padding: { top: number; bottom: number } }) {
      recorded.fits.push(options)
    }
    getSource() {
      return undefined
    }
    remove() {}
  }
  return { default: { Map, Marker } }
})

const emit = (type: string, event: { originalEvent?: Event } = {}) =>
  (recorded.handlers[type] ?? []).forEach((handler) => handler(event))

function mount() {
  const calls = { picked: [] as string[], mapTaps: 0, userMoves: 0, mounts: [] as MarkerMount[] }
  const controller = createBarrioMap(document.createElement('div'), {
    onPick: (id) => calls.picked.push(id),
    onMapTap: () => calls.mapTaps++,
    onUserMove: () => calls.userMoves++,
    onMarkers: (mounts) => (calls.mounts = mounts),
  })
  return { controller, calls }
}

beforeEach(() => {
  localStorage.clear()
  recorded.options.length = 0
  recorded.eases.length = 0
  recorded.paddings.length = 0
  recorded.fits.length = 0
  recorded.zoom = 15
  for (const type of Object.keys(recorded.handlers)) delete recorded.handlers[type]
})

describe('createBarrioMap', () => {
  it('opens on the barrio and fits it once above the sheet', () => {
    const { controller } = mount()
    expect(recorded.options[0]?.bounds).toBeDefined()
    controller.setBottomPadding(300)
    controller.setBottomPadding(120)
    expect(recorded.paddings.map((p) => p.bottom)).toEqual([300, 120])
    expect(recorded.fits).toHaveLength(1)
    expect(recorded.fits[0]?.padding.bottom).toBeGreaterThan(300)
  })

  it('waits for a measured sheet before fitting: zero is not a height', () => {
    const { controller } = mount()
    controller.setBottomPadding(0)
    expect(recorded.fits).toHaveLength(0)
    controller.setBottomPadding(310)
    expect(recorded.fits).toHaveLength(1)
    expect(recorded.fits[0]?.padding.bottom).toBeGreaterThan(310)
  })

  it('never stores a view the user did not choose — the opening fit, a pin, following', () => {
    const { controller } = mount()
    controller.setBottomPadding(310)
    emit('moveend')
    controller.goTo({ lat: 40.4115, lng: -3.712 }, 17)
    emit('movestart')
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).toBeNull()
  })

  it('a gesture that moved nothing does not make the next programmatic move look chosen', () => {
    const { controller } = mount()
    emit('wheel')
    controller.goTo({ lat: 40.4115, lng: -3.712 }, 17)
    emit('moveend')
    controller.zoomBy(1)
    controller.goTo({ lat: 40.4115, lng: -3.712 }, 17)
    emit('moveend')
    expect(localStorage.getItem('lis.map.view')).toBeNull()
  })

  it('a gesture landing in the middle of a programmatic move does not store that move', () => {
    const { controller } = mount()
    controller.goTo({ lat: 40.4115, lng: -3.712 }, 17)
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

  it('reports pin elements and picks by id without tapping the map', () => {
    const { controller, calls } = mount()
    controller.setSightings([
      { id: 'a', lat: 40.411, lng: -3.71 },
      { id: 'b', lat: 40.412, lng: -3.711 },
    ])
    expect(calls.mounts.map((m) => m.id)).toEqual(['a', 'b'])
    calls.mounts[1]?.el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(calls.picked).toEqual(['b'])
    expect(calls.mapTaps).toBe(0)
    controller.setSightings([{ id: 'b', lat: 40.412, lng: -3.711 }])
    expect(calls.mounts.map((m) => m.id)).toEqual(['b'])
  })

  it('tells a tap on the map from a pin, and a user move from a programmatic one', () => {
    const { calls } = mount()
    emit('click')
    expect(calls.mapTaps).toBe(1)
    emit('movestart')
    expect(calls.userMoves).toBe(0)
    emit('movestart', { originalEvent: new Event('touchstart') })
    emit('wheel')
    expect(calls.userMoves).toBe(2)
  })

  it('goTo zooms in only when the map is further out than asked', () => {
    const { controller } = mount()
    controller.goTo({ lat: 40.411, lng: -3.71 }, 17)
    expect(recorded.eases.at(-1)).toMatchObject({ center: [-3.71, 40.411], zoom: 17 })
    recorded.zoom = 18
    controller.goTo({ lat: 40.411, lng: -3.71 }, 17)
    expect(recorded.eases.at(-1)?.zoom).toBeUndefined()
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
