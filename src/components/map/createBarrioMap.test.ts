import { circlePolygon, createBarrioMap, type MarkerMount } from './createBarrioMap'

type MapHandler = (event: { originalEvent?: Event }) => void
type EaseOptions = { center?: [number, number]; zoom?: number; padding?: { bottom: number } }
type MapOptions = { center?: [number, number]; zoom?: number; bounds?: number[][] }

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
  meData: [] as object[],
  meDot: null as HTMLElement | null,
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
      if (this.element.className === 'map-me-dot') recorded.meDot = this.element
      return this
    }
    remove() {
      if (this.element.className === 'map-me-dot') recorded.meDot = null
    }
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
    addSource() {}
    addLayer() {}
    getSource() {
      return { setData: (data: object) => recorded.meData.push(data) }
    }
    remove() {}
  }
  return { default: { Map, Marker } }
})

const emit = (type: string, event: { originalEvent?: Event } = {}) => {
  if (type === 'moveend') recorded.easing = false
  ;(recorded.handlers[type] ?? []).forEach((handler) => handler(event))
}
const userDrag = () => {
  emit('movestart', { originalEvent: new Event('touchstart') })
  emit('moveend')
}
const stored = () => localStorage.getItem('lis.map.view')

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
  recorded.easing = false
  recorded.reducedMotion = false
  recorded.meData.length = 0
  recorded.meDot = null
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

  it("draws the neighbour's position once the style has loaded, under the pins", () => {
    const { controller } = mount()
    controller.setMe({ lat: 40.4115, lng: -3.712, accuracyM: 12 })
    expect(recorded.meDot).toBeNull()
    emit('load')
    expect(recorded.meDot?.style.zIndex).toBe('1')
    expect(recorded.meData.at(-1)).toMatchObject({ type: 'Feature' })
    controller.setMe(null)
    expect(recorded.meDot).toBeNull()
    expect(recorded.meData.at(-1)).toMatchObject({ type: 'FeatureCollection' })
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

  it('draws the picked pin over its neighbours, also when it is added later', () => {
    const { controller, calls } = mount()
    controller.setSightings([
      { id: 'a', lat: 40.411, lng: -3.71 },
      { id: 'b', lat: 40.4111, lng: -3.71 },
    ])
    const order = () => calls.mounts.map((m) => m.el.style.zIndex)
    expect(order()).toEqual(['2', '2'])
    controller.setSelected('a')
    expect(order()).toEqual(['3', '2'])
    controller.setSelected('c')
    controller.setSightings([
      { id: 'a', lat: 40.411, lng: -3.71 },
      { id: 'c', lat: 40.4112, lng: -3.71 },
    ])
    expect(order()).toEqual(['2', '3'])
    controller.setSelected(null)
    expect(order()).toEqual(['2', '2'])
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
    expect(recorded.eases.at(-1)?.zoom).toBe(14)
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

  it('the opening fit wins over a zoom step pressed before the sheet was measured', () => {
    const { controller } = mount()
    controller.zoomBy(1)
    controller.setBottomPadding(300)
    expect(recorded.fits).toHaveLength(1)
    expect(recorded.eases).toHaveLength(1)
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
