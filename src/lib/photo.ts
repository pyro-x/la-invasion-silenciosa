// Golden-rule photo pipeline (brief §17, LCHP-5 spike): every image is
// decoded and re-encoded through a canvas before it leaves the device — that
// alone drops the original EXIF/GPS on all three tested platforms — and then
// the resulting JPEG is walked byte by byte to remove any APPn/COM segment
// the encoder re-added (WebKit re-writes orientation + color profile on
// export). The privacy guarantee is deterministic, not per-engine.

export const MAX_PHOTO_DIMENSION_PX = 1280

// Must stay aligned with MAX_IMAGE_BYTES in the Edge Function
// (supabase/functions/api/lib/validation.ts) and the 0004 bucket cap.
export const MAX_PHOTO_BYTES = 524_288

const ENCODE_QUALITIES = [0.8, 0.7, 0.6, 0.5]

export type PhotoErrorReason = 'decode_failed' | 'encode_failed' | 'too_large'

export class PhotoError extends Error {
  readonly reason: PhotoErrorReason

  constructor(reason: PhotoErrorReason) {
    super(reason)
    this.name = 'PhotoError'
    this.reason = reason
  }
}

/**
 * Removes every APP1–APP15 and COM segment from a JPEG, keeping APP0 (JFIF).
 * Orientation is already baked into the pixels by the canvas re-encode, so
 * dropping a re-added orientation tag is correct (keeping it could rotate
 * twice). Everything from SOS onward is entropy-coded data and is copied
 * verbatim. Throws on anything that is not a structurally sound JPEG — this
 * only ever receives our own encoder's output.
 */
export function stripJpegAppSegments(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new PhotoError('encode_failed')
  }

  const keep: Array<[number, number]> = [[0, 2]]
  let i = 2
  let sawScan = false
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) throw new PhotoError('encode_failed')
    // The standard allows fill bytes (extra 0xFF) before any marker.
    let j = i
    while (bytes[j + 1] === 0xff) j++
    const marker = bytes[j + 1]
    if (marker === 0xda) {
      keep.push([j, bytes.length])
      sawScan = true
      break
    }
    const size = (bytes[j + 2] << 8) | bytes[j + 3]
    const end = j + 2 + size
    if (size < 2 || end > bytes.length) throw new PhotoError('encode_failed')
    const isAppN = marker >= 0xe1 && marker <= 0xef
    const isComment = marker === 0xfe
    if (!isAppN && !isComment) keep.push([j, end])
    i = end
  }
  if (!sawScan) throw new PhotoError('encode_failed')

  const total = keep.reduce((n, [start, end]) => n + (end - start), 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const [start, end] of keep) {
    out.set(bytes.subarray(start, end), offset)
    offset += end - start
  }
  return out
}

/**
 * Full pipeline: decode (honoring EXIF orientation) → downscale to at most
 * 1280 px → JPEG re-encode, stepping quality down until the stripped result
 * fits the upload cap. Returns a metadata-free `image/jpeg` Blob.
 */
export async function processPhoto(source: Blob): Promise<Blob> {
  const canvas = drawScaled(await decodeImage(source))
  for (const quality of ENCODE_QUALITIES) {
    const encoded = await encodeJpeg(canvas, quality)
    const clean = stripJpegAppSegments(new Uint8Array(await encoded.arrayBuffer()))
    if (clean.byteLength <= MAX_PHOTO_BYTES) {
      return new Blob([clean], { type: 'image/jpeg' })
    }
  }
  throw new PhotoError('too_large')
}

type DecodedImage = ImageBitmap | HTMLImageElement

// createImageBitmap({ imageOrientation: 'from-image' }) bakes the EXIF
// rotation into the pixels; verified running on iOS/Android in the LCHP-5
// spike. The <img> fallback covers engines without it (orientation then
// depends on the engine applying it at decode, the modern default).
async function decodeImage(source: Blob): Promise<DecodedImage> {
  try {
    return await createImageBitmap(source, { imageOrientation: 'from-image' })
  } catch {
    return await decodeViaImgElement(source)
  }
}

function decodeViaImgElement(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new PhotoError('decode_failed'))
    }
    img.src = url
  })
}

function drawScaled(image: DecodedImage): HTMLCanvasElement {
  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height
  if (width === 0 || height === 0) throw new PhotoError('decode_failed')

  const scale = Math.min(1, MAX_PHOTO_DIMENSION_PX / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('encode_failed')
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  if (!(image instanceof HTMLImageElement)) image.close()
  return canvas
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PhotoError('encode_failed'))),
      'image/jpeg',
      quality,
    )
  })
}
