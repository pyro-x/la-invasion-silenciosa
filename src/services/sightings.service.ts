// Map reads are REAL (LCHP-13): listMapSightings/listPendingSightings read
// the `public_map_sightings` view (LCHP-11) through the anon client. The
// capture-flow helpers (getApproxLocation/submitSighting) are still fake on
// the prototype's canvas coordinates until M4 (LCHP-14) wires them to the
// Edge Function; the map no longer depends on them.
import { supabase } from '@/lib/supabase'
import type { SpeciesId } from '@/types/species'
import type {
  CaptureLocation,
  MapSighting,
  MapSightingGeo,
  NewSighting,
  SightingStatus,
} from '@/types/sighting'

// species_id is a UUID in the DB; the app keys sprites and the Pokédex by
// slug. anon can read active species (policy species_select_active), so we
// resolve the mapping here.
async function speciesSlugById(): Promise<Map<string, SpeciesId>> {
  const { data, error } = await supabase.from('species').select('id, slug')
  if (error) throw error
  return new Map(data.map((s) => [s.id, s.slug as SpeciesId]))
}

export async function listMapSightings(): Promise<MapSightingGeo[]> {
  const [result, slugs] = await Promise.all([
    supabase
      .from('public_map_sightings')
      .select('id, species_id, lat_public, lng_public, status, verification_count, created_at')
      .order('created_at', { ascending: false }),
    speciesSlugById(),
  ])
  if (result.error) throw result.error

  // View columns are nullable in the generated types; drop any row that is
  // missing an essential field or whose species can't be resolved (e.g. an
  // inactive species) — better a missing pin than a crash. flatMap keeps the
  // result typed.
  return result.data.flatMap((row) => {
    const speciesId = row.species_id ? slugs.get(row.species_id) : undefined
    if (
      !speciesId ||
      row.id == null ||
      row.lat_public == null ||
      row.lng_public == null ||
      row.status == null ||
      row.created_at == null
    ) {
      return []
    }
    return [
      {
        id: row.id,
        speciesId,
        lat: row.lat_public,
        lng: row.lng_public,
        status: row.status as SightingStatus,
        verificationCount: row.verification_count ?? 0,
        createdAt: row.created_at,
      },
    ]
  })
}

export async function listPendingSightings(): Promise<MapSightingGeo[]> {
  const all = await listMapSightings()
  return all.filter((s) => s.status === 'pending')
}

// ---------------------------------------------------------------------------
// Capture flow — still fake (canvas coords) until LCHP-14 (M4). HuntPage is
// the only consumer; the real map above does not touch these.
// ---------------------------------------------------------------------------

const APPROX_LOCATION: CaptureLocation = {
  street: 'Calle de la Cava Baja · La Latina',
  shortStreet: 'Cava Baja',
  x: 710,
  y: 225,
}

export async function getApproxLocation(): Promise<CaptureLocation> {
  return APPROX_LOCATION
}

let nextSightingNumber = 224

/** Fake submit for the M1 capture flow; the real POST /create-sighting is LCHP-14. */
export async function submitSighting(draft: NewSighting): Promise<MapSighting> {
  return {
    ...draft,
    id: `A-${nextSightingNumber++}`,
    reportedBy: 'pyroxine',
    reportedAgo: 'ahora mismo',
    status: 'pending',
    verificationCount: 0,
  }
}
