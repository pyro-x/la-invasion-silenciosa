// POST /create-sighting — the only way a sighting is born (D-037).
// multipart/form-data: photo (file) · species_id · lat · lng · accuracy?
// The server owns every invariant the client could lie about: species must
// exist and be active, coordinates must fall in the neighborhood, the image
// bytes must actually be a small JPEG/WebP, moderation_status is always
// 'pending', and the public coordinate is snapped to the privacy grid.
import type { Caller } from '../lib/auth.ts'
import type { Db } from '../lib/db.ts'
import { apiError, json } from '../lib/responses.ts'
import {
  bodyExceedsLimit,
  detectImageMime,
  isUuid,
  isWithinNeighborhood,
  MAX_IMAGE_BYTES,
  parseFiniteNumber,
  snapToPublicGrid,
} from '../lib/validation.ts'

const DAILY_QUOTA = { anonymous: 2, registered: 5 } as const

const QUOTA_MESSAGE = 'Has llegado al límite de hoy'

export async function createSighting(req: Request, caller: Caller, db: Db): Promise<Response> {
  // Reject oversized requests before parsing the multipart body into memory.
  if (bodyExceedsLimit(req.headers.get('content-length'))) {
    return apiError(413, 'image_too_large', 'La foto supera el tamaño máximo (512 KB)')
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError(400, 'invalid_payload', 'El envío debe ser multipart/form-data')
  }

  const speciesId = form.get('species_id')
  if (typeof speciesId !== 'string' || !isUuid(speciesId)) {
    return apiError(400, 'invalid_payload', 'Falta la especie del avistamiento')
  }

  const lat = parseFiniteNumber(form.get('lat'))
  const lng = parseFiniteNumber(form.get('lng'))
  if (lat === null || lng === null) {
    return apiError(400, 'invalid_payload', 'Faltan las coordenadas del avistamiento')
  }
  const accuracy = parseFiniteNumber(form.get('accuracy'))

  const photo = form.get('photo')
  if (!(photo instanceof File)) {
    return apiError(400, 'invalid_payload', 'Falta la foto del avistamiento')
  }

  if (!isWithinNeighborhood(lat, lng)) {
    return apiError(400, 'out_of_bounds', 'La ubicación está fuera de La Latina')
  }

  if (photo.size > MAX_IMAGE_BYTES) {
    return apiError(413, 'image_too_large', 'La foto supera el tamaño máximo (512 KB)')
  }

  const bytes = new Uint8Array(await photo.arrayBuffer())
  const mime = detectImageMime(bytes)
  if (mime === null) {
    return apiError(400, 'invalid_image', 'La foto debe ser JPEG o WebP')
  }

  if (!(await db.speciesIsActive(speciesId))) {
    return apiError(400, 'unknown_species', 'Esa criatura no está en el catálogo')
  }

  // Friendly pre-check; the 0005 trigger stays the source of truth (D-032)
  // and its rejection is mapped to the same response below.
  const quota = caller.isAnonymous ? DAILY_QUOTA.anonymous : DAILY_QUOTA.registered
  if ((await db.countSightingsToday(caller.id)) >= quota) {
    return apiError(429, 'daily_quota_exceeded', QUOTA_MESSAGE)
  }

  const extension = mime === 'image/jpeg' ? 'jpg' : 'webp'
  const photoPath = `${caller.id}/${crypto.randomUUID()}.${extension}`
  if (!(await db.uploadPhoto(photoPath, bytes, mime))) {
    return apiError(500, 'internal_error', 'No se pudo guardar la foto, inténtalo de nuevo')
  }

  const result = await db.insertSighting({
    species_id: speciesId,
    created_by: caller.id,
    lat_public: snapToPublicGrid(lat),
    lng_public: snapToPublicGrid(lng),
    lat_private: lat,
    lng_private: lng,
    location_accuracy_m: accuracy,
    photo_path: photoPath,
  })

  if (result.kind !== 'created') {
    // Never leave an orphaned photo behind a failed insert.
    await db.removePhoto(photoPath)
    if (result.kind === 'quota_exceeded') {
      return apiError(429, 'daily_quota_exceeded', QUOTA_MESSAGE)
    }
    return apiError(500, 'internal_error', 'No se pudo crear el avistamiento')
  }

  // No PointEvent on purpose: the +10 stays pending until community
  // validation (brief §4/§19, LCHP-15).
  return json(201, { id: result.id, status: 'pending', created_at: result.created_at })
}
