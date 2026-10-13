// The rules of presence (LCHP-49, D-069): the game is played where the
// neighbour stands. The values start from Alcorqueando's RULES and live
// here alone, to be tuned after walking the barrio.
//
// Everything is measured in the browser, against coordinates the browser
// already has: the neighbour's position never leaves the phone.

export type Point = { lat: number; lng: number }
export type Fix = Point & { accuracyM: number }

export const PLAY_RULES = {
  /** Furthest a capture pin may be from the neighbour. */
  captureRadiusM: 50,
  /**
   * Furthest a pending sighting may be to verify it: the capture radius
   * plus the ~35 m the public grid can move a pin from the real spot.
   */
  verifyRadiusM: 85,
  /** Above this GPS error a position is too vague to act on. */
  blockAccuracyM: 150,
  /** Above this GPS error the precision badge warns. */
  warnAccuracyM: 30,
  /** From this age a position is shown as old. */
  stalePositionMs: 2 * 60_000,
} as const

export function distanceMeters(a: Point, b: Point): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h))
}

export const isVague = (fix: Fix): boolean => fix.accuracyM > PLAY_RULES.blockAccuracyM

export type Presence =
  | { kind: 'near'; distanceM: number }
  | { kind: 'far'; distanceM: number }
  /** There is a position, but too vague to say where the neighbour is. */
  | { kind: 'vague'; accuracyM: number }
  | { kind: 'unknown' }

/** Whether the neighbour is close enough to `target` to act on it. */
export function presenceAt(me: Fix | null, target: Point, radiusM: number): Presence {
  if (!me) return { kind: 'unknown' }
  if (isVague(me)) return { kind: 'vague', accuracyM: me.accuracyM }
  const distanceM = distanceMeters(me, target)
  return { kind: distanceM <= radiusM ? 'near' : 'far', distanceM }
}

const NBSP = ' '

export function formatMeters(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(1).replace('.', ',')}${NBSP}km`
    : `${Math.round(value)}${NBSP}m`
}

/** A distance to a public pin: tens of metres are all its grid can honour. */
export function roundedDistance(value: number): number {
  return Math.max(10, Math.round(value / 10) * 10)
}
