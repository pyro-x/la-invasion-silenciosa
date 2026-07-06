// Route-contract tests against an in-memory Db fake — no network, no
// supabase-js. What matters here: every path the acceptance list names
// (malicious payloads, quota, hidden sightings) answers with the exact
// code/status the brief §13 contract documents.
import { assertEquals, assertStringIncludes } from '@std/assert'
import type { Caller } from '../lib/auth.ts'
import type { Db, InsertSightingResult, NewSighting } from '../lib/db.ts'
import { createSighting } from './create-sighting.ts'
import { getPhotoUrl, SIGNED_URL_TTL_SECONDS } from './get-photo-url.ts'

const SPECIES = 'dddddddd-0000-0000-0000-0000000000dd'
const REGISTERED: Caller = { id: 'bbbbbbbb-0000-0000-0000-000000000002', isAnonymous: false }
const ANONYMOUS: Caller = { id: 'cccccccc-0000-0000-0000-000000000003', isAnonymous: true }

interface FakeState {
  activeSpecies: string[]
  sightingsToday: number
  insertResult: InsertSightingResult
  visiblePhotoPath: string | null
  uploads: string[]
  removed: string[]
  inserted: NewSighting[]
  uploadSucceeds: boolean
}

function fakeDb(overrides: Partial<FakeState> = {}): { db: Db; state: FakeState } {
  const state: FakeState = {
    activeSpecies: [SPECIES],
    sightingsToday: 0,
    insertResult: {
      kind: 'created',
      id: 'aaaa1111-0000-0000-0000-000000000001',
      created_at: '2026-07-06T12:00:00Z',
    },
    visiblePhotoPath: null,
    uploads: [],
    removed: [],
    inserted: [],
    uploadSucceeds: true,
    ...overrides,
  }
  const db: Db = {
    speciesIsActive: (id) => Promise.resolve(state.activeSpecies.includes(id)),
    countSightingsToday: () => Promise.resolve(state.sightingsToday),
    insertSighting: (row) => {
      state.inserted.push(row)
      return Promise.resolve(state.insertResult)
    },
    photoPathIfVisible: () => Promise.resolve(state.visiblePhotoPath),
    uploadPhoto: (path) => {
      state.uploads.push(path)
      return Promise.resolve(state.uploadSucceeds)
    },
    removePhoto: (path) => {
      state.removed.push(path)
      return Promise.resolve()
    },
    createSignedPhotoUrl: (path, seconds) =>
      Promise.resolve(`https://storage.example/signed/${path}?exp=${seconds}`),
    getConfigValue: () => Promise.resolve(null),
  }
  return { db, state }
}

// Structurally valid, metadata-free JPEG (SOI · APP0 · SOS · EOI): the
// metadata guard from the LCHP-14 review walks real segments, so the
// fixture must be a JPEG the client pipeline could actually produce.
const JPEG_BYTES = new Uint8Array([
  0xff,
  0xd8, // SOI
  0xff,
  0xe0,
  0x00,
  0x04,
  0x4a,
  0x46, // APP0 (JFIF header, allowed)
  0xff,
  0xda,
  0x00,
  0x02, // SOS
  0x12,
  0x34, // entropy-coded data
  0xff,
  0xd9, // EOI
])

// The same JPEG with an EXIF APP1 segment injected — what a client that
// bypassed src/lib/photo.ts would upload.
const EXIF_JPEG_BYTES = new Uint8Array([
  0xff,
  0xd8, // SOI
  0xff,
  0xe1,
  0x00,
  0x08,
  0x45,
  0x78,
  0x69,
  0x66,
  0x00,
  0x00, // APP1 'Exif\0\0'
  0xff,
  0xda,
  0x00,
  0x02, // SOS
  0x12,
  0x34,
  0xff,
  0xd9, // EOI
])

function sightingForm(
  overrides: Partial<Record<'species_id' | 'lat' | 'lng', string>> = {},
  photo?: Blob,
): Request {
  const form = new FormData()
  form.set('species_id', overrides.species_id ?? SPECIES)
  form.set('lat', overrides.lat ?? '40.4115')
  form.set('lng', overrides.lng ?? '-3.7120')
  form.set('photo', photo ?? new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 'photo.jpg')
  return new Request('http://api/create-sighting', { method: 'POST', body: form })
}

async function errorCode(res: Response): Promise<string> {
  const body = (await res.json()) as { error?: string }
  return body.error ?? ''
}

Deno.test('create-sighting: happy path returns 201 pending and snaps public coords', async () => {
  const { db, state } = fakeDb()
  const res = await createSighting(
    sightingForm({ lat: '40.41152', lng: '-3.71169' }),
    REGISTERED,
    db,
  )
  assertEquals(res.status, 201)
  const body = (await res.json()) as { status?: string }
  assertEquals(body.status, 'pending')
  assertEquals(state.inserted[0].lat_public, 40.4115)
  assertEquals(state.inserted[0].lng_public, -3.7115)
  assertEquals(state.inserted[0].lat_private, 40.41152)
  assertStringIncludes(state.inserted[0].photo_path, `${REGISTERED.id}/`)
})

Deno.test('create-sighting: unknown species is rejected', async () => {
  const { db } = fakeDb({ activeSpecies: [] })
  const res = await createSighting(sightingForm(), REGISTERED, db)
  assertEquals(res.status, 400)
  assertEquals(await errorCode(res), 'unknown_species')
})

Deno.test('create-sighting: coordinates outside the neighborhood are rejected', async () => {
  const { db } = fakeDb()
  const res = await createSighting(sightingForm({ lat: '40.4300' }), REGISTERED, db)
  assertEquals(res.status, 400)
  assertEquals(await errorCode(res), 'out_of_bounds')
})

Deno.test('create-sighting: a PNG pretending to be a JPEG is rejected by magic bytes', async () => {
  const { db } = fakeDb()
  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])], {
    type: 'image/jpeg',
  })
  const res = await createSighting(sightingForm({}, png), REGISTERED, db)
  assertEquals(res.status, 400)
  assertEquals(await errorCode(res), 'invalid_image')
})

Deno.test('create-sighting: an EXIF-bearing JPEG is rejected at the trust boundary', async () => {
  const { db, state } = fakeDb()
  const exif = new Blob([EXIF_JPEG_BYTES], { type: 'image/jpeg' })
  const res = await createSighting(sightingForm({}, exif), REGISTERED, db)
  assertEquals(res.status, 400)
  assertEquals(await errorCode(res), 'invalid_image')
  assertEquals(state.uploads.length, 0) // never reached Storage
})

Deno.test('create-sighting: oversized image is rejected before reading bytes', async () => {
  const { db } = fakeDb()
  const big = new Blob([new Uint8Array(524_289)], { type: 'image/jpeg' })
  const res = await createSighting(sightingForm({}, big), REGISTERED, db)
  assertEquals(res.status, 413)
  assertEquals(await errorCode(res), 'image_too_large')
})

Deno.test('create-sighting: a huge Content-Length is rejected before multipart parsing', async () => {
  const { db, state } = fakeDb()
  const req = new Request('http://api/create-sighting', {
    method: 'POST',
    headers: { 'content-length': String(50_000_000) },
    body: 'irrelevant',
  })
  const res = await createSighting(req, REGISTERED, db)
  assertEquals(res.status, 413)
  assertEquals(await errorCode(res), 'image_too_large')
  assertEquals(state.uploads.length, 0)
})

Deno.test('create-sighting: anonymous quota pre-check answers 429 at 2/day', async () => {
  const { db, state } = fakeDb({ sightingsToday: 2 })
  const res = await createSighting(sightingForm(), ANONYMOUS, db)
  assertEquals(res.status, 429)
  assertEquals(await errorCode(res), 'daily_quota_exceeded')
  assertEquals(state.uploads.length, 0) // rejected before touching storage
})

Deno.test('create-sighting: registered user at 2/day still passes (quota 5)', async () => {
  const { db } = fakeDb({ sightingsToday: 2 })
  const res = await createSighting(sightingForm(), REGISTERED, db)
  assertEquals(res.status, 201)
})

Deno.test('create-sighting: losing the race to the DB trigger still answers 429 and cleans the photo', async () => {
  const { db, state } = fakeDb({ insertResult: { kind: 'quota_exceeded' } })
  const res = await createSighting(sightingForm(), REGISTERED, db)
  assertEquals(res.status, 429)
  assertEquals(state.removed, state.uploads) // orphaned photo removed
})

Deno.test('create-sighting: insert failure removes the uploaded photo', async () => {
  const { db, state } = fakeDb({ insertResult: { kind: 'error', message: 'boom' } })
  const res = await createSighting(sightingForm(), REGISTERED, db)
  assertEquals(res.status, 500)
  assertEquals(state.removed, state.uploads)
})

Deno.test('get-photo-url: visible sighting mints a short-lived URL, without photo_path', async () => {
  const { db } = fakeDb({ visiblePhotoPath: 'user/abc.jpg' })
  const res = await getPhotoUrl(
    new Request('http://api/get-photo-url', {
      method: 'POST',
      body: JSON.stringify({ sighting_id: 'dddddddd-0000-0000-0000-000000000001' }),
    }),
    db,
  )
  assertEquals(res.status, 200)
  const body = (await res.json()) as { url?: string; expires_in?: number; photo_path?: string }
  assertEquals(body.expires_in, SIGNED_URL_TTL_SECONDS)
  assertEquals(body.photo_path, undefined)
  assertStringIncludes(body.url ?? '', 'signed/')
})

Deno.test('get-photo-url: hidden or missing sightings answer identically (no oracle)', async () => {
  const { db } = fakeDb({ visiblePhotoPath: null })
  const res = await getPhotoUrl(
    new Request('http://api/get-photo-url', {
      method: 'POST',
      body: JSON.stringify({ sighting_id: 'dddddddd-0000-0000-0000-000000000004' }),
    }),
    db,
  )
  assertEquals(res.status, 404)
  assertEquals(await errorCode(res), 'not_found')
})

Deno.test('get-photo-url: garbage payloads are 400', async () => {
  const { db } = fakeDb()
  for (const body of ['not json', JSON.stringify({}), JSON.stringify({ sighting_id: 'nope' })]) {
    const res = await getPhotoUrl(
      new Request('http://api/get-photo-url', { method: 'POST', body }),
      db,
    )
    assertEquals(res.status, 400)
  }
})
