// Narrow data-access interface for the routes. The routes never touch
// supabase-js directly: they depend on this contract, which makes their
// logic unit-testable with in-memory fakes (see routes/*.test.ts) and keeps
// the service-role surface in one reviewable place.
import { createClient } from '@supabase/supabase-js'

export interface NewSighting {
  species_id: string
  created_by: string
  lat_public: number
  lng_public: number
  lat_private: number
  lng_private: number
  location_accuracy_m: number | null
  photo_path: string
}

export type InsertSightingResult =
  | { kind: 'created'; id: string; created_at: string }
  | { kind: 'quota_exceeded' }
  | { kind: 'error'; message: string }

export interface Db {
  speciesIsActive(speciesId: string): Promise<boolean>
  countSightingsToday(userId: string): Promise<number>
  insertSighting(row: NewSighting): Promise<InsertSightingResult>
  /** photo_path of a publicly visible (pending|approved) sighting, else null. */
  photoPathIfVisible(sightingId: string): Promise<string | null>
  uploadPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<boolean>
  removePhoto(path: string): Promise<void>
  createSignedPhotoUrl(path: string, expiresInSeconds: number): Promise<string | null>
  getConfigValue(key: string): Promise<string | null>
}

const BUCKET = 'sightings-photos'

export function serviceDb(): Db {
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  return {
    async speciesIsActive(speciesId) {
      const { data } = await client
        .from('species')
        .select('id')
        .eq('id', speciesId)
        .eq('is_active', true)
        .maybeSingle()
      return data !== null
    },

    async countSightingsToday(userId) {
      const midnightUtc = new Date()
      midnightUtc.setUTCHours(0, 0, 0, 0)
      const { count } = await client
        .from('sightings')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', midnightUtc.toISOString())
      return count ?? 0
    },

    async insertSighting(row) {
      const { data, error } = await client
        .from('sightings')
        .insert(row)
        .select('id, created_at')
        .single()
      if (error) {
        // The 0005 trigger is the quota's source of truth; the friendly
        // pre-check can lose a race, so its message is mapped here too.
        if (error.message.includes('daily quota exceeded')) return { kind: 'quota_exceeded' }
        return { kind: 'error', message: error.message }
      }
      return { kind: 'created', id: data.id, created_at: data.created_at }
    },

    async photoPathIfVisible(sightingId) {
      const { data } = await client
        .from('sightings')
        .select('photo_path, moderation_status')
        .eq('id', sightingId)
        .in('moderation_status', ['pending', 'approved'])
        .maybeSingle()
      return data?.photo_path ?? null
    },

    async uploadPhoto(path, bytes, contentType) {
      const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType })
      return error === null
    },

    async removePhoto(path) {
      await client.storage.from(BUCKET).remove([path])
    },

    async createSignedPhotoUrl(path, expiresInSeconds) {
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresInSeconds)
      if (error || !data) return null
      return data.signedUrl
    },

    async getConfigValue(key) {
      const { data } = await client.from('app_config').select('value').eq('key', key).maybeSingle()
      return data?.value ?? null
    },
  }
}
