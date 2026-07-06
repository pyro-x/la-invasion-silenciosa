import { listMapSightings, listPendingSightings } from './sightings.service'

// Mock the Supabase client: listMapSightings issues a species query and a
// view query. The mock returns canned rows so we test the pure transform
// (species_id UUID → slug, nullable-row dropping, model shape) without a network.
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'species') {
        return { select: () => Promise.resolve({ data: SPECIES_ROWS, error: null }) }
      }
      return {
        select: () => ({ order: () => Promise.resolve({ data: VIEW_ROWS, error: null }) }),
      }
    },
  },
}))

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
