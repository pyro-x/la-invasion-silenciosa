// The pending blink, shared by the twins of the pending pins on the map and
// the ring in the «Por verificar» chips. Both are CSS animations started
// where the page's own clock already is, which keeps them in step. Kept apart
// from the map controller so the chips do not pull MapLibre into the first
// bundle.

/** One cycle; `.chip-ring` and `.pin-twin` in globals.css last the same. */
export const BLINK_MS = 1400

/** A CSS `animation-delay` that puts a blink started now where the clock is. */
export const blinkDelayMs = (now: number) => -(now % BLINK_MS)
