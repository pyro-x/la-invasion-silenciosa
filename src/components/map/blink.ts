// The pending blink, shared by the pins on the map (drawn by MapLibre, so
// animated from code) and the ring in the «Por verificar» chips (CSS). Both
// follow the page's own clock, which keeps them in step. Kept apart from the
// map controller so the chips do not pull MapLibre into the first bundle.

/** One cycle; `.chip-ring` in globals.css lasts the same. */
export const BLINK_MS = 1400

/** Opacity at a time on the page's clock: 1 → 0.25 → 1, as `blinkdot` does. */
export const blinkOpacity = (ms: number) =>
  0.625 + 0.375 * Math.cos((2 * Math.PI * (ms % BLINK_MS)) / BLINK_MS)

/** A CSS `animation-delay` that puts a blink started now where the clock is. */
export const blinkDelayMs = (now: number) => -(now % BLINK_MS)
