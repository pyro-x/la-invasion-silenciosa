// What survives leaving the map while the app stays open (LCHP-56, D-071):
// the view the map had and, for a short while, the last position read.
//
// Memory only. Nothing here is written to localStorage, sessionStorage or
// IndexedDB, logged or sent anywhere, and a reload starts clean. The whole
// retention policy is this file: its constants and the one rule that says
// whether a position may be kept.
import { isWithinLaLatina } from '@/lib/geo'
import { PLAY_RULES } from '@/lib/proximity'

export const SESSION_RETENTION = {
  /**
   * Longest a position may wait with no watch running, counted from when it
   * was read: one the app would already call old is never brought back.
   */
  fixMaxAgeMs: PLAY_RULES.stalePositionMs,
} as const

/**
 * How much longer a position may be kept once nobody is watching; zero when
 * it may not be kept at all. One outside the barrio is of no use to any
 * screen, so it is not kept.
 */
export function retentionLeftMs(
  fix: { lat: number; lng: number; at: number },
  now = Date.now(),
): number {
  if (!isWithinLaLatina(fix.lat, fix.lng)) return 0
  return Math.max(0, SESSION_RETENTION.fixMaxAgeMs - (now - fix.at))
}

export type MapView = { center: [number, number]; zoom: number }

export type MapSession = {
  /** Where the map was, or was heading, when the screen was left. */
  view: MapView | null
  /**
   * A position has been drawn on the map since the app was opened. From
   * then on a view may sit on, or next to, where the neighbour is, so none
   * is written to storage again until a reload.
   */
  located: boolean
  following: boolean
  /** The zoom-in that asking for the position gives has been used. */
  zoomSpent: boolean
  /** That zoom-in stopped short on a vague position and is still due. */
  streetOwed: boolean
}

const opening = (): MapSession => ({
  view: null,
  located: false,
  following: true,
  zoomSpent: false,
  streetOwed: false,
})

let session = opening()

export const mapSession = (): Readonly<MapSession> => session

export function keepMapSession(changes: Partial<MapSession>) {
  session = { ...session, ...changes }
}

/** Test seam: back to an app that has just been opened. */
export function resetMapSessionForTests() {
  session = opening()
}
