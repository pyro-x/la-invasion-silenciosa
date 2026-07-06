// Point-event vocabulary and amounts (brief §15), prepared for LCHP-15.
// No route creates point events yet: sighting creation explicitly awards
// nothing (the +10 stays pending until community validation), and the
// verification consolidation runs as a database trigger per D-038 — if
// LCHP-15 ends up needing an Edge-side award path instead, this is where
// it plugs in.

export const POINTS = {
  sighting_validated: 10,
  verification_accepted: 5,
  video_bonus: 10,
} as const

export type PointEventType = keyof typeof POINTS
