import type { SpeciesId } from './species'

export type SightingStatus = 'pending' | 'approved'

/**
 * Map view model. During M1 the coordinates are the prototype's canvas
 * coordinates over the La Latina vector map
 * (docs/prototype/fuentes/assets/lalatina-geo.js, 1000×527 space); they
 * become real lat/lng when MapLibre lands in LCHP-13. See D-016.
 */
export type MapSighting = {
  id: string
  speciesId: SpeciesId
  x: number
  y: number
  /** Approximate street shown to users (privacy: never an exact address). */
  street: string
  /** Author alias. */
  reportedBy: string
  /** Human-readable age, e.g. "hace 2 h" (fake data; real formatting in M3+). */
  reportedAgo: string
  status: SightingStatus
  verificationCount: number
}

/**
 * Approximate location offered during the capture flow. Fake data until real
 * geolocation lands in M4 (LCHP-5 spike); privacy rule: approximate only.
 */
export type CaptureLocation = {
  /** Full label shown in the location step, e.g. "Calle de la Cava Baja · La Latina". */
  street: string
  /** Short form used in the review card, e.g. "Cava Baja". */
  shortStreet: string
  x: number
  y: number
}

/** Payload of a new sighting submitted from the capture flow. */
export type NewSighting = {
  speciesId: SpeciesId
  x: number
  y: number
  street: string
}
