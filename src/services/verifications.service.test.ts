import { countOwnProvisionalConfirmations, submitVerification } from './verifications.service'

// The service is a thin shell around one INSERT: these tests pin the outcome
// mapping (who tipped the threshold, provisional anonymity, the two RLS/
// UNIQUE rejections) — the transaction semantics themselves live in the
// pgTAP suite (verification_consolidation.test.sql).

const insertMock = vi.fn<() => Promise<{ error: { code: string } | null }>>()
const statusMock = vi.fn<() => Promise<{ data: { status: string } | null }>>()
const ownRowsMock = vi.fn<() => Promise<{ data: { sighting_id: string }[] | null }>>()
const eligibleCountMock = vi.fn<(ids: string[]) => Promise<{ count: number | null }>>()
const getSessionMock = vi.fn()

vi.mock('@/lib/session', () => ({ ensureSession: () => Promise.resolve() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => getSessionMock() },
    from: (table: string) =>
      table === 'verifications'
        ? {
            insert: () => insertMock(),
            select: () => ({ eq: () => ({ eq: () => ownRowsMock() }) }),
          }
        : {
            select: () => ({
              eq: () => ({ single: () => statusMock() }),
              in: (_col: string, ids: string[]) => eligibleCountMock(ids),
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
  ownRowsMock.mockResolvedValue({ data: [] })
  eligibleCountMock.mockResolvedValue({ count: 0 })
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

describe('countOwnProvisionalConfirmations (pending-value banner)', () => {
  it('counts only unpaid confirmations whose sighting is still on the public view', async () => {
    ownRowsMock.mockResolvedValue({
      data: [{ sighting_id: 'a' }, { sighting_id: 'b' }, { sighting_id: 'c' }],
    })
    // 'c' was rejected/removed → gone from the view → never payable
    eligibleCountMock.mockResolvedValue({ count: 2 })
    expect(await countOwnProvisionalConfirmations()).toBe(2)
    expect(eligibleCountMock).toHaveBeenCalledWith(['a', 'b', 'c'])
  })

  it('no unpaid rows → 0 without touching the view', async () => {
    expect(await countOwnProvisionalConfirmations()).toBe(0)
    expect(eligibleCountMock).not.toHaveBeenCalled()
  })

  it('no session → 0, and never mints one', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })
    expect(await countOwnProvisionalConfirmations()).toBe(0)
    expect(ownRowsMock).not.toHaveBeenCalled()
  })
})
