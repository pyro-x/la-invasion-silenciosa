import type { SpeciesId } from './species'

export type SightingStatus = 'pending' | 'approved'

/**
 * Legacy prototype view model on the mockup's 1000×527 canvas space (D-016).
 * Only the not-yet-rewired prototype pieces still use it (StreetMap,
 * VerifyModal — LCHP-15 territory); the live map and capture flow are on
 * MapSightingGeo / CapturePosition.
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
 * Real map view model (LCHP-13): the shape of `public_map_sightings` after
 * resolving `species_id` (UUID) to its slug. Deliberately carries NO author
 * and NO exact street — the public view never exposes `created_by`, and the
 * stored coordinate is already approximate (~55 m grid, golden rule). Age is
 * derived in the UI from `createdAt`.
 */
export type MapSightingGeo = {
  id: string
  speciesId: SpeciesId
  lat: number
  lng: number
  status: SightingStatus
  verificationCount: number
  createdAt: string
}
