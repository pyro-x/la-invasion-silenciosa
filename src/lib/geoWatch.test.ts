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

  it('back from the background the watch restarts, but not if the browser would ask again', async () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    permissionsQuery.mockResolvedValue({ state: 'granted' })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(2))
    expect(result.current.kind).toBe('ok')

    permissionsQuery.mockResolvedValue({ state: 'prompt' })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(result.current.kind).toBe('paused'))
    expect(watchPosition).toHaveBeenCalledTimes(2)
  })

  it('does not restart if the map was left while the browser was answering', async () => {
    act(() => startGeoWatch())
    let answer: (status: { state: PermissionState }) => void = () => {}
    permissionsQuery.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    document.dispatchEvent(new Event('visibilitychange'))
    stopGeoWatch()
    answer({ state: 'granted' })
    await Promise.resolve()
    await Promise.resolve()
    expect(watchPosition).toHaveBeenCalledTimes(1)
  })

  it('back from the background it pauses when the browser cannot say it will not ask', async () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    permissionsQuery.mockRejectedValue(new TypeError('no geolocation permission'))
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(result.current.kind).toBe('paused'))

    act(() => startGeoWatch())
    expect(result.current.kind).toBe('searching')
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { watchPosition, clearWatch, getCurrentPosition },
      permissions: undefined,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(result.current.kind).toBe('paused'))
    expect(watchPosition).toHaveBeenCalledTimes(2)
  })

  it('a stopped watch does not bring its old position back when started again', () => {
    const { result } = renderHook(() => useGeoWatch())
    act(() => startGeoWatch())
    act(() => watcher().success(fix(40.4115, -3.712, 12)))
    act(() => stopGeoWatch())
    act(() => startGeoWatch())
    expect(result.current.kind).toBe('searching')
  })

  describe('a position kept across screens (LCHP-56)', () => {
    let T0 = 0
    const locateAndLeave = () => {
      act(() => startGeoWatch())
      act(() => watcher().success(fix(40.4115, -3.712, 12)))
      act(() => stopGeoWatch())
    }
    const stubNavigator = (permissions: { query: typeof permissionsQuery } | undefined) =>
      vi.stubGlobal('navigator', {
        ...navigator,
        geolocation: { watchPosition, clearWatch, getCurrentPosition },
        permissions,
      })

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      T0 = Date.now()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('comes back at once, with the time and accuracy it was read with, when the browser confirms the grant', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      expect(result.current).toEqual({ kind: 'idle', position: null })
      vi.setSystemTime(T0 + 45_000)
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current).toEqual({
        kind: 'ok',
        position: { lat: 40.4115, lng: -3.712, accuracyM: 12, at: T0 },
      })
      expect(watchPosition).toHaveBeenCalledTimes(2)
    })

    it('gives way to the first fresh fix, late as it may be', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      vi.setSystemTime(T0 + 20_000)
      expect(result.current.position?.at).toBe(T0)
      act(() => watcher().success(fix(40.4118, -3.7121, 8)))
      expect(result.current).toEqual({
        kind: 'ok',
        position: { lat: 40.4118, lng: -3.7121, accuracyM: 8, at: T0 + 20_000 },
      })
    })

    it('is not brought back once it is two minutes old', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      vi.setSystemTime(T0 + 2 * 60_000)
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current).toEqual({ kind: 'searching', position: null })
    })

    it('is dropped from memory when its time is up, with nobody asking', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      vi.advanceTimersByTime(2 * 60_000)
      vi.setSystemTime(T0)
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current.kind).toBe('searching')
    })

    it('counts its age from when it was read, across more than one visit', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      vi.setSystemTime(T0 + 70_000)
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current.kind).toBe('ok')
      act(() => stopGeoWatch())
      vi.setSystemTime(T0 + 125_000)
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current).toEqual({ kind: 'searching', position: null })
    })

    it.each<[string, () => void]>([
      ['would ask again', () => permissionsQuery.mockResolvedValue({ state: 'prompt' })],
      ['says it is denied', () => permissionsQuery.mockResolvedValue({ state: 'denied' })],
      ['cannot say', () => permissionsQuery.mockRejectedValue(new TypeError('no entry'))],
      ['has no Permissions API', () => stubNavigator(undefined)],
    ])('is not shown, and is forgotten, when the browser %s', async (_name, arrange) => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      arrange()
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current).toEqual({ kind: 'idle', position: null })
      expect(watchPosition).toHaveBeenCalledTimes(1)
      expect(getCurrentPosition).not.toHaveBeenCalled()

      stubNavigator({ query: permissionsQuery })
      permissionsQuery.mockReset()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current.position).toBeNull()
    })

    it('is not shown on a tap: a tap searches afresh, also while the browser is still answering', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      let answer: (status: { state: PermissionState }) => void = () => {}
      permissionsQuery.mockReturnValue(new Promise((resolve) => (answer = resolve)))
      const resuming = resumeGeoWatchIfGranted()
      act(() => startGeoWatch())
      expect(result.current).toEqual({ kind: 'searching', position: null })
      answer({ state: 'granted' })
      await act(() => resuming)
      expect(result.current).toEqual({ kind: 'searching', position: null })
      expect(watchPosition).toHaveBeenCalledTimes(2)
    })

    it('does not outlive a trip to the background with no watch running', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      document.dispatchEvent(new Event('visibilitychange'))
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current).toEqual({ kind: 'searching', position: null })
    })

    it('is not kept when it lies outside La Latina', async () => {
      const { result } = renderHook(() => useGeoWatch())
      act(() => startGeoWatch())
      act(() => watcher().success(fix(41.3874, 2.1686, 12)))
      act(() => stopGeoWatch())
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current).toEqual({ kind: 'searching', position: null })
    })

    it('is forgotten by a denial that arrives after it was shown again', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      act(() => watcher().fail(failure(1)))
      expect(result.current).toEqual({ kind: 'denied', position: null })
      act(() => stopGeoWatch())
      await act(() => resumeGeoWatchIfGranted())
      expect(result.current.position).toBeNull()
      expect(watchPosition).toHaveBeenCalledTimes(2)
    })

    it('once shown again it is the watch’s own: a tap on «Ir a mi posición» keeps it on screen', async () => {
      const { result } = renderHook(() => useGeoWatch())
      locateAndLeave()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      act(() => startGeoWatch())
      expect(result.current.position).toMatchObject({ lat: 40.4115, at: T0 })
    })

    it('writes nothing of it to storage: only the mark that the permission was granted', async () => {
      const written = vi.spyOn(localStorage, 'setItem')
      const inSession = vi.spyOn(sessionStorage, 'setItem')
      locateAndLeave()
      permissionsQuery.mockResolvedValue({ state: 'granted' })
      await act(() => resumeGeoWatchIfGranted())
      act(() => stopGeoWatch())
      expect(written.mock.calls).not.toHaveLength(0)
      expect(
        written.mock.calls.every(([key, value]) => key === 'lis.geo.granted' && value === '1'),
      ).toBe(true)
      expect(Object.keys(localStorage)).toEqual(['lis.geo.granted'])
      expect(inSession).not.toHaveBeenCalled()
      written.mockRestore()
      inSession.mockRestore()
    })
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
