import type { SpeciesId } from './species'

export type SightingStatus = 'pending' | 'approved'

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
