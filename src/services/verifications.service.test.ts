import { submitVerification } from './verifications.service'

// The service is a thin shell around one INSERT: these tests pin the outcome
// mapping (who tipped the threshold, provisional anonymity, the two RLS/
// UNIQUE rejections) — the transaction semantics themselves live in the
// pgTAP suite (verification_consolidation.test.sql).

const insertMock = vi.fn<() => Promise<{ error: { code: string } | null }>>()
const statusMock = vi.fn<() => Promise<{ data: { status: string } | null }>>()
const getSessionMock = vi.fn()

vi.mock('@/lib/session', () => ({ ensureSession: () => Promise.resolve() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => getSessionMock() },
    from: (table: string) =>
      table === 'verifications'
        ? { insert: () => insertMock() }
        : {
            select: () => ({
              eq: () => ({ single: () => statusMock() }),
            }),
          },
  },
}))

function sessionWith(isAnonymous: boolean) {
  getSessionMock.mockResolvedValue({
    data: { session: { user: { id: 'user-1', is_anonymous: isAnonymous } } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  insertMock.mockResolvedValue({ error: null })
  statusMock.mockResolvedValue({ data: { status: 'pending' } })
  sessionWith(false)
})

describe('submitVerification outcome mapping', () => {
  it('registered + sighting now approved → validated', async () => {
    statusMock.mockResolvedValue({ data: { status: 'approved' } })
    expect(await submitVerification('s-1')).toEqual({ kind: 'validated' })
  })

  it('registered + still pending → counted (below threshold)', async () => {
    expect(await submitVerification('s-1')).toEqual({ kind: 'counted' })
  })

  it('anonymous session + sighting still pending → saved_provisional', async () => {
    sessionWith(true)
    expect(await submitVerification('s-1')).toEqual({ kind: 'saved_provisional' })
  })

  it('anonymous session + sighting now approved → validated (open-switch case: the view is authoritative)', async () => {
    sessionWith(true)
    statusMock.mockResolvedValue({ data: { status: 'approved' } })
    expect(await submitVerification('s-1')).toEqual({ kind: 'validated' })
  })

  it('UNIQUE violation → already_verified', async () => {
    insertMock.mockResolvedValue({ error: { code: '23505' } })
    expect(await submitVerification('s-1')).toEqual({ kind: 'already_verified' })
  })

  it('RLS rejection (own sighting or no longer pending) → not_verifiable', async () => {
    insertMock.mockResolvedValue({ error: { code: '42501' } })
    expect(await submitVerification('s-1')).toEqual({ kind: 'not_verifiable' })
  })

  it('a failed read-back degrades to counted, never to an error (the row IS stored)', async () => {
    statusMock.mockResolvedValue({ data: null })
    expect(await submitVerification('s-1')).toEqual({ kind: 'counted' })
  })

  it('unexpected failures → error', async () => {
    insertMock.mockRejectedValue(new Error('boom'))
    expect(await submitVerification('s-1')).toEqual({ kind: 'error' })
  })
})
