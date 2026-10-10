// The pending blink, shared by the twins of the pending pins on the map and
// the ring in the «Por verificar» chips. Both are CSS animations started
// where the page's own clock already is, which keeps them in step. Kept apart
// from the map controller so the chips do not pull MapLibre into the first
// bundle.

/** One cycle; `.chip-ring` and `.pin-twin` in globals.css last the same. */
export const BLINK_MS = 1400

/** A CSS `animation-delay` that puts a blink started now where the clock is. */
export const blinkDelayMs = (now: number) => -(now % BLINK_MS)

// CSS `ease-in-out`, cubic-bezier(0.42, 0, 0.58, 1): progress at a share of the time.
const easeInOut = (share: number) => {
  let low = 0
  let high = 1
  for (let i = 0; i < 24; i++) {
    const t = (low + high) / 2
    const x = 3 * (1 - t) ** 2 * t * 0.42 + 3 * (1 - t) * t ** 2 * 0.58 + t ** 3
    if (x < share) low = t
    else high = t
  }
  const t = (low + high) / 2
  return 3 * (1 - t) * t ** 2 + t ** 3
}

/** Opacity at a time on the page's clock, as `blinkdot` draws it: 1 → 0.25 → 1. */
export const blinkOpacity = (ms: number) => {
  const cycle = (ms % BLINK_MS) / BLINK_MS
  return cycle < 0.5 ? 1 - 0.75 * easeInOut(cycle * 2) : 0.25 + 0.75 * easeInOut(cycle * 2 - 1)
}

/** How long a twin takes to go from whole to wherever the blink is. */
export const ARRIVAL_MS = 450

/**
 * The opacities of a twin that arrives whole at `now` and is on the blink by
 * the end of `ARRIVAL_MS`, at even steps: what is left to the blink shrinks
 * to nothing, so there is no jump at either end.
 */
export const arrivalOpacities = (now: number, steps = 12) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const share = i / steps
    const blink = blinkOpacity(now + share * ARRIVAL_MS)
    return blink + (1 - blink) * (1 - easeInOut(share))
  })
