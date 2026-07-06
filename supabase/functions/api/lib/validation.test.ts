import { assertEquals } from '@std/assert'
import {
  bodyExceedsLimit,
  detectImageMime,
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
