// POST /get-photo-url — evidence on demand (brief §18): given a publicly
// visible sighting (pending|approved), mint a short-lived signed URL.
// photo_path never leaves the server (D-037); hidden states answer exactly
// like nonexistent ids so the route is not an oracle over moderation.
import type { Db } from '../lib/db.ts'
import { apiError, json } from '../lib/responses.ts'
import { isUuid } from '../lib/validation.ts'

export const SIGNED_URL_TTL_SECONDS = 300

const NOT_FOUND_MESSAGE = 'Ese avistamiento no está disponible'

interface GetPhotoUrlPayload {
  sighting_id?: string
}

export async function getPhotoUrl(req: Request, db: Db): Promise<Response> {
  let body: GetPhotoUrlPayload
  try {
    body = await req.json()
  } catch {
    return apiError(400, 'invalid_payload', 'El cuerpo debe ser JSON')
  }

  // The wire is untrusted regardless of the declared type: re-check at runtime.
  const sightingId = typeof body?.sighting_id === 'string' ? body.sighting_id : ''
  if (!isUuid(sightingId)) {
    return apiError(400, 'invalid_payload', 'Falta el identificador del avistamiento')
  }

  const photoPath = await db.photoPathIfVisible(sightingId)
  if (photoPath === null) {
    return apiError(404, 'not_found', NOT_FOUND_MESSAGE)
  }

  const url = await db.createSignedPhotoUrl(photoPath, SIGNED_URL_TTL_SECONDS)
  if (url === null) {
    return apiError(404, 'not_found', NOT_FOUND_MESSAGE)
  }

  return json(200, { url, expires_in: SIGNED_URL_TTL_SECONDS })
}
