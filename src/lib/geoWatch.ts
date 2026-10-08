// Live position for the map's «dónde estoy» (LCHP-34), ported from
// Alcorqueando's geo.js. A watch, not a one-shot fix: the capture flow keeps
// its own getGeoFix() (src/lib/geo.ts) until LCHP-36.
//
// The native permission prompt fires only from startGeoWatch(), which must
// be called from a tap (D-052) — iOS shows its question reliably only on a
// user gesture. resumeGeoWatchIfGranted() may start without a tap, but only
// when the browser says it will not ask.
import { useSyncExternalStore } from 'react'

export type GeoPosition = { lat: number; lng: number; accuracyM: number; at: number }

export type GeoWatchState =
  | { kind: 'idle'; position: null }
  | { kind: 'searching'; position: null }
  | { kind: 'ok'; position: GeoPosition }
  | { kind: 'denied'; position: null }
  | { kind: 'unavailable'; position: null }
  | { kind: 'timeout'; position: null }
  | { kind: 'unsupported'; position: null }

// A phone that does not move sends no new position, so silence does not
// mean the position is lost: the last one is kept and refreshed quietly.
const KEEP_POSITION_MS = 10 * 60 * 1000
const REFRESH_MS = 20_000
const GRANTED_KEY = 'lis.geo.granted'

let state: GeoWatchState = { kind: 'idle', position: null }
let lastPosition: GeoPosition | null = null
let watchId: number | null = null
let refreshTimer: ReturnType<typeof setInterval> | undefined
// Bumped on every start and stop: a callback from an earlier watch — the
// browser can still deliver one after clearWatch — is ignored.
let generation = 0
const listeners = new Set<() => void>()

// Absent in some embedded browsers, and null in non-browser environments.
function geolocation(): Geolocation | null {
  return 'geolocation' in navigator && navigator.geolocation ? navigator.geolocation : null
}

function set(next: GeoWatchState) {
  state = next
  listeners.forEach((listener) => listener())
}

function rememberGranted(granted: boolean) {
  try {
    if (granted) localStorage.setItem(GRANTED_KEY, '1')
    else localStorage.removeItem(GRANTED_KEY)
  } catch {
    // storage unavailable: the watch just won't resume by itself next visit
  }
}

function grantedBefore(): boolean {
  try {
    return localStorage.getItem(GRANTED_KEY) === '1'
  } catch {
    return false
  }
}

function onPosition(result: GeolocationPosition) {
  rememberGranted(true)
  lastPosition = {
    lat: result.coords.latitude,
    lng: result.coords.longitude,
    accuracyM: result.coords.accuracy,
    at: Date.now(),
  }
  set({ kind: 'ok', position: lastPosition })
}

function onError(error: GeolocationPositionError) {
  // code 1 = PERMISSION_DENIED, 3 = TIMEOUT (the constants may be absent in
  // non-browser test environments).
  if (error.code === 1) {
    rememberGranted(false)
    halt()
    lastPosition = null
    set({ kind: 'denied', position: null })
    return
  }
  // The watch keeps running: a fix can still arrive later.
  if (state.kind === 'ok') return
  set({ kind: error.code === 3 ? 'timeout' : 'unavailable', position: null })
}

function hasRecentPosition(): boolean {
  return lastPosition !== null && Date.now() - lastPosition.at < KEEP_POSITION_MS
}

function refreshQuietly() {
  if (watchId === null || !lastPosition || Date.now() - lastPosition.at < REFRESH_MS) return
  const mine = generation
  const current = (result: GeolocationPosition) => {
    if (mine === generation) onPosition(result)
  }
  geolocation()?.getCurrentPosition(current, () => {}, {
    enableHighAccuracy: true,
    maximumAge: 10_000,
    timeout: REFRESH_MS,
  })
}

function halt() {
  generation++
  if (watchId !== null) geolocation()?.clearWatch(watchId)
  watchId = null
  clearInterval(refreshTimer)
}

/** Stops watching and forgets what was on screen: whoever reads the state
 * next (a later visit to the map) must not see a position nobody is
 * updating, possibly after the permission was revoked. */
export function stopGeoWatch() {
  halt()
  if (state.kind !== 'idle') set({ kind: 'idle', position: null })
}

/** Call from a tap. Starts (or restarts) the watch. */
export function startGeoWatch() {
  const api = geolocation()
  if (!api) {
    set({ kind: 'unsupported', position: null })
    return
  }
  halt()
  const mine = generation
  if (hasRecentPosition() && lastPosition) set({ kind: 'ok', position: lastPosition })
  else set({ kind: 'searching', position: null })
  const onFix = (result: GeolocationPosition) => {
    if (mine === generation) onPosition(result)
  }
  const onFail = (error: GeolocationPositionError) => {
    if (mine === generation) onError(error)
  }
  watchId = api.watchPosition(onFix, onFail, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 30_000,
  })
  refreshTimer = setInterval(refreshQuietly, REFRESH_MS)
}

/** Starts without a tap only when the browser says it will not ask again. */
export async function resumeGeoWatchIfGranted(): Promise<void> {
  if (watchId !== null || !grantedBefore() || !navigator.permissions?.query) return
  const asked = generation
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    // The map may have been left while the browser was answering.
    if (asked === generation && status.state === 'granted') startGeoWatch()
  } catch {
    // Some Safari versions have no geolocation entry in the Permissions API.
  }
}

// Phones pause a watch while the page is in the background.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && watchId !== null) startGeoWatch()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => state

export function useGeoWatch(): GeoWatchState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Test seam: back to a cold module. */
export function resetGeoWatchForTests() {
  halt()
  lastPosition = null
  state = { kind: 'idle', position: null }
}
