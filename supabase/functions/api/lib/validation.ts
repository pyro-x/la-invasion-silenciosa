// Pure validation helpers — everything here is unit-tested without network.

// Real La Latina frame verified by the LCHP-4 spike (brief §21), padded so
// a sighting at the neighborhood's edge is not rejected by GPS drift.
export const LA_LATINA_BBOX = {
  minLng: -3.7173,
  maxLng: -3.7068,
  minLat: 40.4093,
  maxLat: 40.4138,
} as const

const BBOX_MARGIN = 0.002

export function isWithinNeighborhood(lat: number, lng: number): boolean {
  return (
    lat >= LA_LATINA_BBOX.minLat - BBOX_MARGIN &&
    lat <= LA_LATINA_BBOX.maxLat + BBOX_MARGIN &&
    lng >= LA_LATINA_BBOX.minLng - BBOX_MARGIN &&
    lng <= LA_LATINA_BBOX.maxLng + BBOX_MARGIN
  )
}

// The public map shows approximate locations by design (golden rule, brief
// §31): the exact submitted coordinate is stored privately and the public
// one snaps to a ~0.0005° grid (≈55 m N-S, ≈42 m E-W in Madrid).
const PUBLIC_GRID = 0.0005

export function snapToPublicGrid(value: number): number {
  return Number((Math.round(value / PUBLIC_GRID) * PUBLIC_GRID).toFixed(4))
}

// Must stay aligned with the bucket caps from migration 0004.
export const MAX_IMAGE_BYTES = 524_288

// Hard cap on the whole request body, enforced from the Content-Length
// header BEFORE the multipart body is parsed into memory (Codex review:
// otherwise an oversized upload consumes function memory/time just to be
// rejected afterwards). Allows the image cap plus form-field/boundary
// overhead.
export const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 65_536

export function bodyExceedsLimit(contentLength: string | null): boolean {
  if (contentLength === null) return false
  const n = Number(contentLength)
  return Number.isFinite(n) && n > MAX_BODY_BYTES
}

export type ImageMime = 'image/jpeg' | 'image/webp'

// Magic-byte sniffing: the client's declared Content-Type is not trusted.
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp'
  }
  return null
}

// Golden rule, enforced at the trust boundary (LCHP-14 Codex review): a
// legitimate client only ever sends pipeline-cleaned JPEGs (src/lib/photo.ts
// strips every APPn/COM segment and never produces WebP), so ANY metadata
// reaching this route means a modified client. Fail closed: malformed
// structures count as carrying metadata.
export function imageCarriesMetadata(bytes: Uint8Array, mime: ImageMime): boolean {
  return mime === 'image/jpeg' ? jpegCarriesMetadata(bytes) : webpCarriesMetadata(bytes)
}

// Walks JPEG segments up to SOS: APP1–APP15 (EXIF/XMP/ICC/…) and COM are
// metadata. APP0/JFIF is a plain header and stays allowed.
function jpegCarriesMetadata(bytes: Uint8Array): boolean {
  let i = 2
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return true
    let j = i
    while (bytes[j + 1] === 0xff) j++
    const marker = bytes[j + 1]
    if (marker === 0xda) return false
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) return true
    const size = (bytes[j + 2] << 8) | bytes[j + 3]
    if (size < 2 || j + 2 + size > bytes.length) return true
    i = j + 2 + size
  }
  return true // no scan data → not a JPEG our client would produce
}

// Walks RIFF chunks: EXIF and XMP chunks are metadata (the client never
// produces WebP at all, so any hit is a hostile upload by definition).
function webpCarriesMetadata(bytes: Uint8Array): boolean {
  const fourCC = (at: number) =>
    String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3])
  let i = 12
  while (i + 8 <= bytes.length) {
    const id = fourCC(i)
    if (id === 'EXIF' || id === 'XMP ') return true
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24)
    if (size < 0) return true
    i += 8 + size + (size % 2) // chunks are padded to even sizes
  }
  return false
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function parseFiniteNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
