import {
  resetGeoWatchForTests,
  resumeGeoWatchIfGranted,
  startGeoWatch,
  stopGeoWatch,
  useGeoWatch,
} from '@/lib/geoWatch'
import { renderHook, act } from '@testing-library/react'

type Success = (position: GeolocationPosition) => void
type Failure = (error: GeolocationPositionError) => void

const watchPosition = vi.fn<(success: Success, failure: Failure) => number>()
const clearWatch = vi.fn<(id: number) => void>()
const getCurrentPosition = vi.fn<(success: Success, failure: Failure) => void>()
const permissionsQuery = vi.fn<() => Promise<{ state: PermissionState }>>()

function fix(lat: number, lng: number, accuracy: number): GeolocationPosition {
  const coords = {
    latitude: lat,
    longitude: lng,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  }
  return {
    coords: { ...coords, toJSON: () => coords },
    timestamp: Date.now(),
    toJSON: () => ({}),
  }
}

function failure(code: number): GeolocationPositionError {
  return { code, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
}

function watcher() {
  const [success, fail] = watchPosition.mock.calls.at(-1) ?? []
  if (!success || !fail) throw new Error('watchPosition was not called')
  return { success, fail }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  resetGeoWatchForTests()
  watchPosition.mockReturnValue(7)
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: { watchPosition, clearWatch, getCurrentPosition },
    permissions: { query: permissionsQuery },
  })
})

afterEach(() => {
  stopGeoWatch()
  vi.unstubAllGlobals()
})

describe('geoWatch', () => {
  it('does nothing until asked: no geolocation call on import or on reading the state', () => {
    const { result } = renderHook(() => useGeoWatch())
    expect(result.current.kind).toBe('idle')
    expect(watchPosition).not.toHaveBeenCalled()
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('searches, then reports the fix with its accuracy', () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    expect(result.current.kind).toBe('searching')
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    expect(result.current).toMatchObject({
      kind: 'ok',
      position: { lat: 40.4115, lng: -3.712, accuracyM: 12 },
    })
  })

  it('a denial stops the watch and is not retried behind the user’s back', async () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    act(() => watcher().fail(failure(1)))
    expect(result.current.kind).toBe('denied')
    expect(clearWatch).toHaveBeenCalledWith(7)
    permissionsQuery.mockResolvedValue({ state: 'granted' })
    await resumeGeoWatchIfGranted()
    expect(watchPosition).toHaveBeenCalledTimes(1)
  })

  it('a timeout before any fix says so; after a fix the position is kept', () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    act(() => watcher().fail(failure(3)))
    expect(result.current.kind).toBe('timeout')
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    act(() => watcher().fail(failure(3)))
    expect(result.current.kind).toBe('ok')
  })

  it('ignores late callbacks from a watch that was replaced', () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    const first = watcher()
    act(() => startGeoWatch())
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    act(() => first.fail(failure(1)))
    expect(result.current.kind).toBe('ok')
    act(() => first.success(fix(41.3874, 2.1686, 5)))
    expect(result.current).toMatchObject({ position: { lat: 40.4115, lng: -3.712 } })
  })

  it('stopping forgets the position on screen, and a late fix does not bring it back', () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    const stopped = watcher()
    act(() => stopped.success(fix(40.4115, -3.712, 12)))
    act(() => stopGeoWatch())
    expect(result.current).toEqual({ kind: 'idle', position: null })
    act(() => stopped.success(fix(40.4116, -3.7121, 12)))
    expect(result.current.kind).toBe('idle')
  })

  it('a later visit shows no position when the permission is no longer granted', async () => {
    act(() => startGeoWatch())
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    act(() => stopGeoWatch())
    permissionsQuery.mockResolvedValue({ state: 'prompt' })
    await resumeGeoWatchIfGranted()
    const { result } = renderHook(() => useGeoWatch())
    expect(result.current).toEqual({ kind: 'idle', position: null })
  })

  it('reports a browser without geolocation', () => {
    vi.stubGlobal('navigator', { permissions: { query: permissionsQuery } })
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    expect(result.current.kind).toBe('unsupported')
  })

  describe('resuming without a tap', () => {
    it('never starts for someone who has not granted before', async () => {
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await resumeGeoWatchIfGranted()
      expect(watchPosition).not.toHaveBeenCalled()
    })

    it('starts when a past grant is confirmed by the browser', async () => {
      act(() => startGeoWatch())
      act(() => watcher().success(fix(40.4115, -3.712, 12)))
      stopGeoWatch()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await resumeGeoWatchIfGranted()
      expect(watchPosition).toHaveBeenCalledTimes(2)
    })

    it('does not start if the map was left while the browser was answering', async () => {
      act(() => startGeoWatch())
      act(() => watcher().success(fix(40.4115, -3.712, 12)))
      stopGeoWatch()
      let answer: (status: { state: PermissionState }) => void = () => {}
      permissionsQuery.mockReturnValue(new Promise((resolve) => (answer = resolve)))
      const resuming = resumeGeoWatchIfGranted()
      stopGeoWatch()
      answer({ state: 'granted' })
      await resuming
      expect(watchPosition).toHaveBeenCalledTimes(1)
    })

    it('does not start when the browser would ask again', async () => {
      act(() => startGeoWatch())
      act(() => watcher().success(fix(40.4115, -3.712, 12)))
      stopGeoWatch()
      permissionsQuery.mockResolvedValue({ state: 'prompt' })
      await resumeGeoWatchIfGranted()
      expect(watchPosition).toHaveBeenCalledTimes(1)
    })
  })
})
