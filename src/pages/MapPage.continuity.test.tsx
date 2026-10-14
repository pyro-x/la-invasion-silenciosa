// LCHP-56 (D-071), end to end: the real route tree, the real map screen,
// its real wrapper and controller, and the real watch. Leaving the map is a
// click on a real tab, so the page, the map and the watch are unmounted and
// mounted again as in the app. Only what the test environment lacks is
// stubbed: Supabase, WebGL (a MapLibre that keeps a camera), the phone's
// geolocation and the browser's word on the permission.
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetGeoWatchForTests } from '@/lib/geoWatch'
import { PLAY_RULES } from '@/lib/proximity'
import { renderRoute } from '@/test/render'

type Camera = { center: [number, number]; zoom: number }
type MapOptions = Partial<Camera> & { bounds?: number[][] }
type MapEvent = { originalEvent?: Event }
type MapHandler = (event: MapEvent) => void
type FakeMap = {
  options: MapOptions
  camera: Camera
  eases: Partial<Camera>[]
  fits: number
  removed: boolean
  fire: (type: string, event?: MapEvent) => void
}

const maps = vi.hoisted(() => [] as FakeMap[])

vi.mock('maplibre-gl', () => {
  class Map implements FakeMap {
    options: MapOptions
    camera: Camera
    eases: Partial<Camera>[] = []
    fits = 0
    removed = false
    handlers: Record<string, MapHandler[]> = {}
    transform = {
      applyConstrain: (center: { lng: number; lat: number }, zoom: number) => ({ center, zoom }),
    }
    constructor(options: MapOptions) {
      this.options = options
      this.camera =
        options.center && options.zoom !== undefined
          ? { center: options.center, zoom: options.zoom }
          : { center: [-3.712, 40.4115], zoom: 14.6 }
      maps.push(this)
    }
    on(type: string, handler: MapHandler | string) {
      if (typeof handler === 'function') (this.handlers[type] ??= []).push(handler)
    }
    fire(type: string, event: MapEvent = {}) {
      ;(this.handlers[type] ?? []).forEach((handler) => handler(event))
    }
    getCenter() {
      return { lng: this.camera.center[0], lat: this.camera.center[1] }
    }
    getZoom() {
      return this.camera.zoom
    }
    isMoving() {
      return false
    }
    stop() {}
    setPadding() {}
    easeTo(to: Partial<Camera>) {
      this.eases.push(to)
      this.camera = { center: to.center ?? this.camera.center, zoom: to.zoom ?? this.camera.zoom }
      this.fire('moveend')
    }
    fitBounds() {
      this.fits++
      this.camera = { center: [-3.712, 40.4115], zoom: 14.6 }
      this.fire('moveend')
    }
    remove() {
      this.removed = true
    }
  }
  class Marker {
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    remove() {}
  }
  return { default: { Map, Marker } }
})

vi.mock('@/components/map/attribution', () => ({ addAttribution: () => () => {} }))

const SPECIES_ROWS = [{ id: 'uuid-turistox', slug: 'turistox' }]
// One pending creature some 30 m from where the neighbour stands.
const VIEW_ROWS = [
  {
    id: 's-near',
    species_id: 'uuid-turistox',
    lat_public: 40.4117,
    lng_public: -3.7118,
    status: 'pending',
    verification_count: 0,
    created_at: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
]

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) =>
      table === 'species'
        ? { select: () => Promise.resolve({ data: SPECIES_ROWS, error: null }) }
        : { select: () => ({ order: () => Promise.resolve({ data: VIEW_ROWS, error: null }) }) },
  },
}))

type Success = (position: GeolocationPosition) => void
type Failure = (error: GeolocationPositionError) => void
const watchPosition = vi.fn<(success: Success, failure: Failure) => number>()
const getCurrentPosition = vi.fn<(success: Success, failure: Failure) => void>()
const clearWatch = vi.fn<(id: number) => void>()
const permissionsQuery = vi.fn<(descriptor: { name: string }) => Promise<{ state: string }>>()
let geolocationPermission: 'granted' | 'prompt' | 'denied' | 'unknown' = 'granted'

function geoFix(lat: number, lng: number, accuracy = 12): GeolocationPosition {
  const coords = {
    latitude: lat,
    longitude: lng,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  }
  return { coords: { ...coords, toJSON: () => coords }, timestamp: Date.now(), toJSON: () => ({}) }
}

const HOME: [number, number] = [-3.712, 40.4115]
const SHEET = { x: 0, y: 0, top: 0, left: 0, width: 390, height: 280, right: 390, bottom: 280 }
const writes: string[] = []

beforeEach(() => {
  maps.length = 0
  writes.length = 0
  resetGeoWatchForTests()
  localStorage.clear()
  sessionStorage.clear()
  geolocationPermission = 'granted'
  watchPosition.mockReset().mockReturnValue(1)
  getCurrentPosition.mockReset()
  clearWatch.mockReset()
  permissionsQuery.mockReset().mockImplementation(({ name }) => {
    if (name !== 'geolocation') return Promise.resolve({ state: 'prompt' })
    return geolocationPermission === 'unknown'
      ? Promise.reject(new TypeError('no geolocation entry'))
      : Promise.resolve({ state: geolocationPermission })
  })
  vi.stubGlobal('navigator', {
    ...navigator,
    userAgent: navigator.userAgent,
    maxTouchPoints: 0,
    geolocation: { watchPosition, getCurrentPosition, clearWatch },
    permissions: { query: permissionsQuery },
  })
  // happy-dom lays nothing out: the sheet reports a height so the map gets
  // its opening frame, as on a phone.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...SHEET,
    toJSON: () => SHEET,
  })
  for (const storage of [localStorage, sessionStorage]) {
    const store = storage.setItem.bind(storage)
    vi.spyOn(storage, 'setItem').mockImplementation((key: string, value: string) => {
      writes.push(`${key}=${value}`)
      store(key, value)
    })
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const liveMap = () => {
  const map = maps.at(-1)
  if (!map) throw new Error('no map was created')
  return map
}
const mapCount = () => maps.length
const mapIsUp = (count: number) => waitFor(() => expect(maps).toHaveLength(count))
const watcher = () => {
  const [success, fail] = watchPosition.mock.calls.at(-1) ?? []
  if (!success || !fail) throw new Error('no watch is running')
  return { success, fail }
}
const followButton = () => screen.getByRole('button', { name: 'Ir a mi posición' })

type User = ReturnType<typeof userEvent.setup>

/** Opens the map, taps «Usar mi ubicación» and lets the phone answer. */
async function openAndLocate(user: User) {
  renderRoute('/mapa')
  await mapIsUp(1)
  await user.click(await screen.findByRole('button', { name: 'Usar mi ubicación' }))
  act(() => watcher().success(geoFix(HOME[1], HOME[0])))
  await waitFor(() => expect(liveMap().camera).toEqual({ center: HOME, zoom: 17 }))
  expect(await screen.findByText('± 12 m')).toBeInTheDocument()
}

const OTHER_SCREENS = [
  {
    name: 'Especies',
    leave: (user: User) => user.click(screen.getByRole('link', { name: 'Especies' })),
  },
  {
    name: 'Ranking',
    leave: (user: User) => user.click(screen.getByRole('link', { name: 'Ranking' })),
  },
  {
    name: 'Perfil',
    leave: (user: User) => user.click(screen.getByRole('link', { name: 'Perfil' })),
  },
  {
    name: 'Cazar',
    leave: (user: User) => user.click(screen.getByRole('button', { name: 'Cazar' })),
  },
] as const

/** A real navigation away and back: the map screen is unmounted and mounted again. */
async function roundTrip(
  user: User,
  screenName: (typeof OTHER_SCREENS)[number]['name'] = 'Ranking',
) {
  const before = mapCount()
  const left = liveMap()
  const other = OTHER_SCREENS.find((candidate) => candidate.name === screenName)
  await other?.leave(user)
  await waitFor(() => expect(left.removed).toBe(true))
  expect(screen.queryByRole('button', { name: 'Ir a mi posición' })).not.toBeInTheDocument()
  if (screenName === 'Cazar') await user.click(await screen.findByRole('link', { name: 'Cerrar' }))
  else await user.click(screen.getByRole('link', { name: 'Mapa' }))
  await mapIsUp(before + 1)
  await screen.findByRole('button', { name: 'Ir a mi posición' })
}

describe('map continuity across the app’s screens (LCHP-56)', () => {
  it.each(OTHER_SCREENS.map((other) => other.name))(
    'back from %s the map is where it was, the position on it, before any new fix',
    async (screenName) => {
      const user = userEvent.setup()
      await openAndLocate(user)
      const watchesBefore = watchPosition.mock.calls.length

      await roundTrip(user, screenName)

      const map = liveMap()
      expect(map.options).toMatchObject({ center: HOME, zoom: 17 })
      expect(map.options.bounds).toBeUndefined()
      // the browser confirmed the grant: the watch is running again and the
      // position kept from before is on screen, not a search
      await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(watchesBefore + 1))
      expect(await screen.findByText('± 12 m')).toBeInTheDocument()
      expect(screen.getByText('Cerca de ti')).toBeInTheDocument()
      expect(screen.queryByText(/Buscando tu posición/)).not.toBeInTheDocument()
      expect(followButton()).toHaveAttribute('aria-pressed', 'true')
      // the sheet has been measured by now: no opening fit took the view away
      expect(map.fits).toBe(0)
      expect(map.eases).toEqual([])
      expect(map.camera).toEqual({ center: HOME, zoom: 17 })
    },
  )

  it('a fix that arrives late after coming back recentres without zooming in again', async () => {
    const user = userEvent.setup()
    await openAndLocate(user)
    // the neighbour zooms out with the buttons, which does not end following
    await user.click(screen.getByRole('button', { name: 'Alejar el mapa' }))
    await waitFor(() => expect(liveMap().camera.zoom).toBe(16))

    await roundTrip(user)
    const map = liveMap()
    expect(map.camera).toEqual({ center: HOME, zoom: 16 })
    expect(map.eases).toEqual([])

    const walked: [number, number] = [-3.7117, 40.4116]
    act(() => watcher().success(geoFix(walked[1], walked[0], 9)))
    await waitFor(() => expect(map.camera.center).toEqual(walked))
    expect(map.camera.zoom).toBe(16)
    expect(map.eases.every((ease) => ease.zoom === undefined)).toBe(true)
    expect(await screen.findByText('± 9 m')).toBeInTheDocument()
  })

  it('a kept position is not called live: past two minutes it is not brought back, and the map still is', async () => {
    const user = userEvent.setup()
    await openAndLocate(user)
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + PLAY_RULES.stalePositionMs + 1_000)

    await roundTrip(user)

    expect(liveMap().options).toMatchObject({ center: HOME, zoom: 17 })
    expect(await screen.findByText(/Buscando tu posición/)).toBeInTheDocument()
    expect(screen.queryByText('± 12 m')).not.toBeInTheDocument()
    expect(screen.getByText('En el barrio')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Verificar/ })).not.toBeInTheDocument()
    clock.mockRestore()
  })

  it('a kept position keeps the time it was read: it shows its age once old, and an old one warns without blocking (D-069)', async () => {
    const user = userEvent.setup()
    await openAndLocate(user)
    const readAt = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(readAt + 110_000)

    await roundTrip(user)
    expect(await screen.findByText('± 12 m')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verificar TURISTOX' })).toBeInTheDocument()

    // the watch stays silent; opening the card draws the badge again
    clock.mockReturnValue(readAt + 130_000)
    await user.click(screen.getByText('TURISTOX'))
    expect(await screen.findByText('Posición de hace 2 min')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✔ Verificar' })).toBeEnabled()
    clock.mockRestore()
  })

  it('a map moved by hand comes back where it was left, not following, and a new fix does not take it', async () => {
    const user = userEvent.setup()
    await openAndLocate(user)
    const first = liveMap()
    const lookedAt: [number, number] = [-3.7095, 40.4104]
    act(() => {
      first.fire('movestart', { originalEvent: new Event('touchstart') })
      first.camera = { center: lookedAt, zoom: 16.2 }
      first.fire('moveend')
    })
    await waitFor(() => expect(followButton()).toHaveAttribute('aria-pressed', 'false'))

    await roundTrip(user)

    const map = liveMap()
    expect(map.options).toMatchObject({ center: lookedAt, zoom: 16.2 })
    expect(followButton()).toHaveAttribute('aria-pressed', 'false')
    expect(await screen.findByText('± 12 m')).toBeInTheDocument()
    act(() => watcher().success(geoFix(40.4116, -3.7117)))
    expect(map.eases).toEqual([])
    expect(map.fits).toBe(0)
    expect(map.camera).toEqual({ center: lookedAt, zoom: 16.2 })
    expect(followButton()).toHaveAttribute('aria-pressed', 'false')

    // and it stays that way over a second trip
    await roundTrip(user, 'Perfil')
    expect(liveMap().options).toMatchObject({ center: lookedAt, zoom: 16.2 })
    expect(followButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it.each([
    ['would ask again', 'prompt'],
    ['cannot say (Safari)', 'unknown'],
    ['says it is denied', 'denied'],
  ] as const)(
    'when the browser %s the map is back where it was, with no position, no watch and no prompt',
    async (_name, permission) => {
      const user = userEvent.setup()
      await openAndLocate(user)
      const watchesBefore = watchPosition.mock.calls.length
      geolocationPermission = permission

      await roundTrip(user)

      const map = liveMap()
      expect(map.options).toMatchObject({ center: HOME, zoom: 17 })
      expect(map.fits).toBe(0)
      expect(
        await screen.findByText('Para jugar, el mapa tiene que saber dónde estás.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('± 12 m')).not.toBeInTheDocument()
      expect(screen.getByText('En el barrio')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Verificar/ })).not.toBeInTheDocument()
      // nothing that could raise the native prompt ran without a tap
      expect(watchPosition).toHaveBeenCalledTimes(watchesBefore)
      expect(getCurrentPosition).not.toHaveBeenCalled()

      // no dot on this map, but its view came from one: a drag stores nothing
      act(() => {
        map.fire('movestart', { originalEvent: new Event('touchstart') })
        map.fire('moveend')
      })
      expect(localStorage.getItem('lis.map.view')).toBeNull()

      // the tap is the gesture: a fresh search, never the position kept from before
      await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
      expect(watchPosition).toHaveBeenCalledTimes(watchesBefore + 1)
      expect(await screen.findByText(/Buscando tu posición/)).toBeInTheDocument()
      expect(screen.queryByText('± 12 m')).not.toBeInTheDocument()
    },
  )

  it('a permission revoked while away is told as a denial on the next tap, and nothing kept is shown', async () => {
    const user = userEvent.setup()
    await openAndLocate(user)
    geolocationPermission = 'denied'
    await roundTrip(user)
    await user.click(await screen.findByRole('button', { name: 'Usar mi ubicación' }))
    act(() =>
      watcher().fail({
        code: 1,
        message: '',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }),
    )
    expect(await screen.findByText(/Sin permiso de ubicación/)).toBeInTheDocument()
    expect(screen.queryByText('± 12 m')).not.toBeInTheDocument()

    geolocationPermission = 'granted'
    const watchesBefore = watchPosition.mock.calls.length
    await roundTrip(user)
    expect(watchPosition).toHaveBeenCalledTimes(watchesBefore)
    expect(liveMap().options).toMatchObject({ center: HOME, zoom: 17 })
  })

  it('writes nothing of the position or of the view to localStorage or sessionStorage', async () => {
    const user = userEvent.setup()
    await openAndLocate(user)
    for (const other of OTHER_SCREENS) await roundTrip(user, other.name)
    const map = liveMap()
    act(() => {
      map.fire('movestart', { originalEvent: new Event('touchstart') })
      map.camera = { center: [-3.7119, 40.4114], zoom: 17 }
      map.fire('moveend')
    })
    await roundTrip(user)
    act(() => {
      liveMap().fire('movestart', { originalEvent: new Event('touchstart') })
      liveMap().fire('moveend')
    })

    expect(writes.filter((write) => !write.startsWith('sil_demo_alias_v1='))).not.toHaveLength(0)
    for (const write of writes) {
      expect(write).toMatch(/^(lis\.geo\.granted=1|sil_demo_alias_v1=[a-z]+_\d+)$/)
    }
    expect(localStorage.getItem('lis.map.view')).toBeNull()
  })
})
