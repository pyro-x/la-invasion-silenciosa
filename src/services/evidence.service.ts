// Photo evidence on demand (brief §18): the map never loads photos; when the
// user asks, /get-photo-url mints a ~5-minute signed URL (LCHP-12). Requires
// a session (D-043) — an anonymous one is created lazily.
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export type EvidenceResult =
  | { kind: 'ready'; url: string; expiresIn: number }
  | { kind: 'unavailable' } // hidden, missing, or a seed without a photo
  | { kind: 'error' }

interface PhotoUrlResponse {
  url?: string
  expires_in?: number
}

export async function getEvidenceUrl(sightingId: string): Promise<EvidenceResult> {
  try {
    await ensureSession()
    const { data, error } = await supabase.functions.invoke<PhotoUrlResponse>('api/get-photo-url', {
      body: { sighting_id: sightingId },
    })
    if (error || !data || typeof data.url !== 'string') {
      // The route answers 404 for hidden ids and for sightings without a
      // photo alike (no-oracle contract); surface both as "unavailable".
      return { kind: 'unavailable' }
    }
    // Local-stack quirk: signed URLs minted inside the Edge runtime carry the
    // docker-internal host. Hosted URLs are already public and untouched.
    const url = data.url.replace(/^http:\/\/kong:8000/, import.meta.env.VITE_SUPABASE_URL)
    return { kind: 'ready', url, expiresIn: data.expires_in ?? 300 }
  } catch {
    return { kind: 'error' }
  }
}
