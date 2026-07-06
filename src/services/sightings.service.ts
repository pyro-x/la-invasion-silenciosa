// Map reads (LCHP-13) and real capture submit (LCHP-14). Reads go straight
// to the `public_map_sightings` view through the anon client; a sighting is
// only ever born through POST /create-sighting (D-037), which owns every
// server-side invariant (bbox, image bytes, quota, public-grid snapping).
import { FunctionsHttpError } from '@supabase/supabase-js'
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { SpeciesId } from '@/types/species'
import type { MapSightingGeo, SightingStatus } from '@/types/sighting'

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
// Capture submit (LCHP-14)
// ---------------------------------------------------------------------------

/** What the capture flow sends: an EXIF-free photo plus the exact position. */
export type NewSightingSubmission = {
  speciesId: SpeciesId
  /** Already processed by src/lib/photo.ts (≤1280 px JPEG, metadata-free). */
  photo: Blob
  lat: number
  lng: number
  accuracyM: number | null
}

export type SubmitSightingResult =
  | { kind: 'created'; id: string }
  /** The server said no; `message` is its Spanish string, shown verbatim. */
  | { kind: 'rejected'; message: string }
  | { kind: 'error' }

interface CreateSightingResponse {
  id?: string
}

interface ApiErrorBody {
  error?: string
  message?: string
}

/** Exported for tests: the exact multipart contract of /create-sighting. */
export function buildSightingForm(speciesUuid: string, s: NewSightingSubmission): FormData {
  const form = new FormData()
  form.append('photo', new File([s.photo], 'sighting.jpg', { type: 'image/jpeg' }))
  form.append('species_id', speciesUuid)
  form.append('lat', String(s.lat))
  form.append('lng', String(s.lng))
  if (s.accuracyM !== null) form.append('accuracy', String(s.accuracyM))
  return form
}

export async function submitSighting(
  submission: NewSightingSubmission,
): Promise<SubmitSightingResult> {
  try {
    await ensureSession()
    const species = await supabase
      .from('species')
      .select('id')
      .eq('slug', submission.speciesId)
      .single()
    if (species.error) return { kind: 'error' }

    const { data, error } = await supabase.functions.invoke<CreateSightingResponse>(
      'api/create-sighting',
      { body: buildSightingForm(species.data.id, submission) },
    )
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const response: Response = error.context
        const body: ApiErrorBody | null = await response.json().catch(() => null)
        if (typeof body?.message === 'string') return { kind: 'rejected', message: body.message }
      }
      return { kind: 'error' }
    }
    if (typeof data?.id !== 'string') return { kind: 'error' }
    return { kind: 'created', id: data.id }
  } catch {
    return { kind: 'error' }
  }
}
