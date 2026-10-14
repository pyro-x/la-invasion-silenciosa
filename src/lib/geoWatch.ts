// Live position for the map's «dónde estoy» (LCHP-34) and for the capture
// flow (LCHP-54), ported from Alcorqueando's geo.js. A watch, not a one-shot
// fix: one module, one position, whichever screen is asking.
//
// The native permission prompt fires only from startGeoWatch(), which must
// be called from a tap (D-052) — iOS shows its question reliably only on a
// user gesture. Two paths start it without a tap — resuming on arrival and
// restarting on return from the background — and both only when the browser
// says it will not ask.
//
// Stopping the watch is not forgetting (LCHP-56, D-071): the last position
// may wait in memory, under the rules of mapSession.ts, for the watch to be
// resumed. It is never in the state while no watch runs.
import { useSyncExternalStore } from 'react'
import { retentionLeftMs } from '@/lib/mapSession'

export type GeoPosition = { lat: number; lng: number; accuracyM: number; at: number }

export type GeoWatchState =
  | { kind: 'idle'; position: null }
  /** Was watching; stopped itself rather than risk a prompt with no tap. */
  | { kind: 'paused'; position: null }
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
// `lastPosition` belongs to a watch that was stopped, and nothing shows it.
let retained = false
let forgetTimer: ReturnType<typeof setTimeout> | undefined
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

function forgetPosition() {
  lastPosition = null
  retained = false
  clearTimeout(forgetTimer)
}

function onPosition(result: GeolocationPosition) {
  rememberGranted(true)
  retained = false
  clearTimeout(forgetTimer)
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
    forgetPosition()
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

/** Stops watching and takes the position out of the state: whoever reads
 * it next must not see a position nobody is updating, possibly after the
 * permission was revoked. The position itself may wait, unseen, for a watch
 * resumed with the browser's word that the permission still stands. */
export function stopGeoWatch() {
  halt()
  const left = lastPosition ? retentionLeftMs(lastPosition) : 0
  if (left > 0) {
    retained = true
    clearTimeout(forgetTimer)
    forgetTimer = setTimeout(forgetPosition, left)
  } else {
    forgetPosition()
  }
  if (state.kind !== 'idle') set({ kind: 'idle', position: null })
}

function forgetRetained() {
  if (retained) forgetPosition()
}

// A position that waited for this watch is shown only when the browser has
// just said the permission stands; a tap gets a fresh search instead.
function begin(permissionConfirmed: boolean) {
  const api = geolocation()
  if (!api) {
    forgetRetained()
    set({ kind: 'unsupported', position: null })
    return
  }
  halt()
  if (retained) {
    const usable = permissionConfirmed && lastPosition !== null && retentionLeftMs(lastPosition) > 0
    if (usable) {
      retained = false
      clearTimeout(forgetTimer)
    } else {
      forgetPosition()
    }
  }
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

/** Call from a tap. Starts (or restarts) the watch. */
export function startGeoWatch() {
  begin(false)
}

/** Starts without a tap only when the browser says it will not ask again.
 * Any other answer also drops a position kept from an earlier watch. */
export async function resumeGeoWatchIfGranted(): Promise<void> {
  if (watchId !== null) return
  if (!grantedBefore() || !navigator.permissions?.query) {
    forgetRetained()
    return
  }
  const asked = generation
  let granted = false
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    granted = status.state === 'granted'
  } catch {
    // Some Safari versions have no geolocation entry in the Permissions API.
  }
  // The screen may have been left while the browser was answering.
  if (asked !== generation) return
  if (granted) begin(true)
  else forgetRetained()
}

// Phones pause a watch while the page is in the background, so it is
// started again on return — but only if the browser says outright that it
// will not ask. A one-time grant can lapse meanwhile, and restarting then
// would raise the native prompt with no tap (D-052). A browser that cannot
// say (no Permissions API, or Safari answering 'prompt' for everything)
// gets the safe side: the watch pauses and the neighbour taps again.
async function restartAfterBackground(): Promise<void> {
  const mine = generation
  let granted = false
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })
    granted = status?.state === 'granted'
  } catch {
    // No geolocation entry in the Permissions API.
  }
  if (mine !== generation) return
  if (granted) {
    begin(true)
    return
  }
  halt()
  forgetPosition()
  set({ kind: 'paused', position: null })
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    // With no watch running, a kept position does not outlive a trip to
    // the background: nobody knows how long the page was away.
    if (watchId === null) forgetRetained()
    else if (document.visibilityState === 'visible') void restartAfterBackground()
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
  forgetPosition()
  state = { kind: 'idle', position: null }
}
