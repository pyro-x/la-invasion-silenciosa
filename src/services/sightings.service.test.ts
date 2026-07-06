import { FunctionsHttpError } from '@supabase/supabase-js'
import {
  buildSightingForm,
  listMapSightings,
  listPendingSightings,
  submitSighting,
  type NewSightingSubmission,
} from './sightings.service'
import { ensureSession } from '@/lib/session'

// Mock the Supabase client: reads issue a species query and a view query;
// submit issues a slug→UUID lookup and a functions.invoke. The mocks return
// canned data so we test the pure transforms and the error mapping without a
// network.
const SPECIES_ROWS = [
  { id: 'uuid-candadin', slug: 'candadin' },
  { id: 'uuid-turistox', slug: 'turistox' },
]

const VIEW_ROWS = [
  {
    id: 's1',
    species_id: 'uuid-candadin',
    lat_public: 40.4118,
    lng_public: -3.7105,
    status: 'approved',
    verification_count: 4,
    created_at: '2026-07-06T10:00:00Z',
  },
  {
    id: 's2',
    species_id: 'uuid-turistox',
    lat_public: 40.411,
    lng_public: -3.7074,
    status: 'pending',
    verification_count: 0,
    created_at: '2026-07-06T11:00:00Z',
  },
  // species not in the catalog (e.g. inactive) → must be dropped, not crash
  {
    id: 's3',
    species_id: 'uuid-unknown',
    lat_public: 40.41,
    lng_public: -3.71,
    status: 'approved',
    verification_count: 1,
    created_at: '2026-07-06T09:00:00Z',
  },
]

const invokeMock = vi.fn()

vi.mock('@/lib/session', () => ({ ensureSession: vi.fn(() => Promise.resolve()) }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'species') {
        return {
          // Awaited directly by listMapSightings AND chained .eq().single()
          // by submitSighting — a thenable with the chain methods covers both.
          select: () =>
            Object.assign(Promise.resolve({ data: SPECIES_ROWS, error: null }), {
              eq: (_column: string, slug: string) => ({
                single: () => {
                  const row = SPECIES_ROWS.find((s) => s.slug === slug)
                  return Promise.resolve(
                    row
                      ? { data: { id: row.id }, error: null }
                      : { data: null, error: { message: 'not found' } },
                  )
                },
              }),
            }),
        }
      }
      return {
        select: () => ({ order: () => Promise.resolve({ data: VIEW_ROWS, error: null }) }),
      }
    },
    functions: {
      invoke: (name: string, options: { body: FormData }) => invokeMock(name, options),
    },
  },
}))

const SUBMISSION: NewSightingSubmission = {
  speciesId: 'candadin',
  photo: new Blob(['jpeg-bytes'], { type: 'image/jpeg' }),
  lat: 40.411828123456,
  lng: -3.710467987654,
  accuracyM: 12.4,
}

beforeEach(() => {
  invokeMock.mockReset()
})

describe('sightings service · public view → map model', () => {
  it('resolves species_id to slug and drops unresolvable rows', async () => {
    const result = await listMapSightings()
    expect(result).toHaveLength(2) // s3 (unknown species) dropped
    expect(result[0]).toEqual({
      id: 's1',
      speciesId: 'candadin',
      lat: 40.4118,
      lng: -3.7105,
      status: 'approved',
      verificationCount: 4,
      createdAt: '2026-07-06T10:00:00Z',
    })
  })

  it('never carries author or street (privacy: not in the model at all)', async () => {
    const [first] = await listMapSightings()
    expect(first).not.toHaveProperty('reportedBy')
    expect(first).not.toHaveProperty('street')
  })

  it('listPendingSightings returns only pending', async () => {
    const pending = await listPendingSightings()
    expect(pending.map((s) => s.id)).toEqual(['s2'])
  })
})

describe('sightings service · submit → /create-sighting', () => {
  it('builds the exact multipart contract, with full coordinate precision', () => {
    const form = buildSightingForm('uuid-candadin', SUBMISSION)
    const photo = form.get('photo')
    if (!(photo instanceof File)) throw new Error('photo entry must be a File')
    expect(photo.name).toBe('sighting.jpg')
    expect(photo.type).toBe('image/jpeg')
    expect(form.get('species_id')).toBe('uuid-candadin')
    expect(form.get('lat')).toBe('40.411828123456')
    expect(form.get('lng')).toBe('-3.710467987654')
    expect(form.get('accuracy')).toBe('12.4')
  })

  it('omits accuracy when the pin was placed manually', () => {
    const form = buildSightingForm('uuid-candadin', { ...SUBMISSION, accuracyM: null })
    expect(form.get('accuracy')).toBeNull()
  })

  it('ensures a session, resolves the species UUID and posts the form', async () => {
    invokeMock.mockResolvedValue({ data: { id: 'new-id' }, error: null })
    const result = await submitSighting(SUBMISSION)
    expect(result).toEqual({ kind: 'created', id: 'new-id' })
    expect(ensureSession).toHaveBeenCalled()
    const [name, options] = invokeMock.mock.calls[0]
    expect(name).toBe('api/create-sighting')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('species_id')).toBe('uuid-candadin')
  })

  it('surfaces the server rejection message verbatim (quota, bounds…)', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(
        new Response(
          JSON.stringify({
            error: 'daily_quota_exceeded',
            message: 'Has llegado al límite de hoy',
          }),
          { status: 429 },
        ),
      ),
    })
    const result = await submitSighting(SUBMISSION)
    expect(result).toEqual({ kind: 'rejected', message: 'Has llegado al límite de hoy' })
  })

  it('maps a network-level failure to a generic error kind', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('fetch failed') })
    expect(await submitSighting(SUBMISSION)).toEqual({ kind: 'error' })
  })

  it('fails safe when the species slug cannot be resolved', async () => {
    expect(await submitSighting({ ...SUBMISSION, speciesId: 'keymon' })).toEqual({ kind: 'error' })
    expect(invokeMock).not.toHaveBeenCalled()
  })
})
