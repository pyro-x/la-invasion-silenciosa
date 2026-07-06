import { assertEquals } from '@std/assert'
import {
  bodyExceedsLimit,
  detectImageMime,
  imageCarriesMetadata,
  isUuid,
  isWithinNeighborhood,
  parseFiniteNumber,
  snapToPublicGrid,
} from './validation.ts'

Deno.test('bbox accepts La Latina and its GPS-drift margin', () => {
  assertEquals(isWithinNeighborhood(40.4115, -3.712), true) // Plaza de la Cebada-ish
  assertEquals(isWithinNeighborhood(40.4093, -3.7173), true) // exact corner
  assertEquals(isWithinNeighborhood(40.4145, -3.71), true) // inside the margin
})

Deno.test('bbox rejects the rest of Madrid and the world', () => {
  assertEquals(isWithinNeighborhood(40.42, -3.71), false) // Sol-ish, too far north
  assertEquals(isWithinNeighborhood(40.4115, -3.75), false) // Casa de Campo
  assertEquals(isWithinNeighborhood(0, 0), false)
  assertEquals(isWithinNeighborhood(-40.4115, 3.712), false) // sign flips
})

Deno.test('public grid snaps to ~55 m and keeps 4 decimals', () => {
  assertEquals(snapToPublicGrid(40.41152), 40.4115)
  assertEquals(snapToPublicGrid(40.41137), 40.4115)
  assertEquals(snapToPublicGrid(40.41112), 40.411)
  assertEquals(snapToPublicGrid(-3.71169), -3.7115)
})

Deno.test('image sniffing trusts bytes, not headers', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
  assertEquals(detectImageMime(jpeg), 'image/jpeg')
  assertEquals(detectImageMime(webp), 'image/webp')
  assertEquals(detectImageMime(png), null)
  assertEquals(detectImageMime(new Uint8Array([])), null)
})

Deno.test('body limit guard rejects from the header, before parsing', () => {
  assertEquals(bodyExceedsLimit(String(600_000)), true)
  assertEquals(bodyExceedsLimit(String(100_000)), false)
  assertEquals(bodyExceedsLimit(null), false) // no header → parse normally
  assertEquals(bodyExceedsLimit('not-a-number'), false)
})

Deno.test('uuid and number parsing reject garbage', () => {
  assertEquals(isUuid('dddddddd-0000-0000-0000-000000000001'), true)
  assertEquals(isUuid('not-a-uuid'), false)
  assertEquals(isUuid(''), false)
  assertEquals(parseFiniteNumber('40.4115'), 40.4115)
  assertEquals(parseFiniteNumber('  '), null)
  assertEquals(parseFiniteNumber('NaN'), null)
  assertEquals(parseFiniteNumber('Infinity'), null)
  assertEquals(parseFiniteNumber(null), null)
})

const segment = (marker: number, payload: number[]) => [
  0xff,
  marker,
  (payload.length + 2) >> 8,
  (payload.length + 2) & 0xff,
  ...payload,
]
const cleanJpeg = (...extra: number[][]) =>
  new Uint8Array([
    0xff,
    0xd8,
    ...segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]), // APP0/JFIF
    ...extra.flat(),
    ...segment(0xda, [0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]), // SOS
    0x12,
    0x34,
    0xff,
    0xd9,
  ])

Deno.test('metadata guard: a pipeline-clean JPEG (SOI·APP0·SOS) passes', () => {
  assertEquals(imageCarriesMetadata(cleanJpeg(), 'image/jpeg'), false)
})

Deno.test('metadata guard: APP1/EXIF, any other APPn and COM are rejected', () => {
  const exif = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
  const icc = segment(0xe2, [0x49, 0x43, 0x43])
  const comment = segment(0xfe, [0x68, 0x69])
  assertEquals(imageCarriesMetadata(cleanJpeg(exif), 'image/jpeg'), true)
  assertEquals(imageCarriesMetadata(cleanJpeg(icc), 'image/jpeg'), true)
  assertEquals(imageCarriesMetadata(cleanJpeg(comment), 'image/jpeg'), true)
})

Deno.test('metadata guard: malformed JPEG structure fails closed', () => {
  const truncated = cleanJpeg().slice(0, 6)
  const noScan = new Uint8Array([0xff, 0xd8, ...segment(0xe0, [0x4a, 0x46])])
  assertEquals(imageCarriesMetadata(truncated, 'image/jpeg'), true)
  assertEquals(imageCarriesMetadata(noScan, 'image/jpeg'), true)
})

Deno.test('metadata guard: WebP EXIF/XMP chunks are rejected, plain VP8 passes', () => {
  const riff = (chunks: number[]) => {
    const bytes = [
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, // RIFF + size (unchecked)
      0x57, 0x45, 0x42, 0x50, // WEBP
      ...chunks,
    ]
    return new Uint8Array(bytes)
  }
  const chunk = (id: string, payload: number[]) => [
    ...[...id].map((c) => c.charCodeAt(0)),
    payload.length, 0, 0, 0,
    ...payload,
    ...(payload.length % 2 ? [0] : []),
  ]
  assertEquals(imageCarriesMetadata(riff(chunk('VP8 ', [1, 2, 3, 4])), 'image/webp'), false)
  assertEquals(
    imageCarriesMetadata(riff([...chunk('VP8 ', [1, 2]), ...chunk('EXIF', [9])]), 'image/webp'),
    true,
  )
  assertEquals(imageCarriesMetadata(riff(chunk('XMP ', [1])), 'image/webp'), true)
})
