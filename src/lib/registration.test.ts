import { confirmUpgrade, registrationState, requestUpgrade } from '@/lib/registration'

const getSessionMock = vi.fn()
const updateUserMock =
  vi.fn<
    (attrs: { email: string }) => Promise<{ error: { code?: string; status?: number } | null }>
  >()
const verifyOtpMock = vi.fn<(params: object) => Promise<{ error: { status?: number } | null }>>()
const totalPointsMock = vi.fn<() => Promise<{ data: { total_points: number } | null }>>()

vi.mock('@/lib/session', () => ({ ensureSession: () => Promise.resolve() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
      updateUser: (attrs: { email: string }) => updateUserMock(attrs),
      verifyOtp: (params: object) => verifyOtpMock(params),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => totalPointsMock() }) }),
    }),
  },
}))

function sessionUser(user: object | null) {
  getSessionMock.mockResolvedValue({ data: { session: user ? { user } : null } })
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionUser({ id: 'u1', is_anonymous: true })
  updateUserMock.mockResolvedValue({ error: null })
  verifyOtpMock.mockResolvedValue({ error: null })
  totalPointsMock.mockResolvedValue({ data: { total_points: 0 } })
})

describe('registrationState', () => {
  it('reads anonymous / pending / registered from the session user', async () => {
    expect(await registrationState()).toEqual({ kind: 'anonymous' })
    sessionUser({ id: 'u1', is_anonymous: true, new_email: 'rosa@test.local' })
    expect(await registrationState()).toEqual({ kind: 'pending', email: 'rosa@test.local' })
    sessionUser({ id: 'u1', is_anonymous: false, email: 'rosa@test.local' })
    expect(await registrationState()).toEqual({ kind: 'registered', email: 'rosa@test.local' })
  })

  it('no session at all reads as anonymous', async () => {
    sessionUser(null)
    expect(await registrationState()).toEqual({ kind: 'anonymous' })
  })
})

describe('requestUpgrade', () => {
  it('maps success and the three named failures', async () => {
    expect(await requestUpgrade('rosa@test.local')).toEqual({
      kind: 'sent',
      email: 'rosa@test.local',
    })
    updateUserMock.mockResolvedValue({ error: { code: 'email_exists', status: 422 } })
    expect(await requestUpgrade('x@x.com')).toEqual({ kind: 'email_taken' })
    updateUserMock.mockResolvedValue({ error: { code: 'validation_failed', status: 400 } })
    expect(await requestUpgrade('nope')).toEqual({ kind: 'invalid_email' })
    updateUserMock.mockResolvedValue({ error: { status: 429 } })
    expect(await requestUpgrade('x@x.com')).toEqual({ kind: 'rate_limited' })
  })
})

describe('confirmUpgrade', () => {
  it('verifies the code as an email_change OTP and reports recovered points', async () => {
    totalPointsMock
      .mockResolvedValueOnce({ data: { total_points: 0 } })
      .mockResolvedValueOnce({ data: { total_points: 15 } })
    expect(await confirmUpgrade('rosa@test.local', '123456')).toEqual({
      kind: 'registered',
      pointsRecovered: 15,
    })
    expect(verifyOtpMock).toHaveBeenCalledWith({
      type: 'email_change',
      email: 'rosa@test.local',
      token: '123456',
    })
  })

  it('never reports negative recovery and survives an unreadable profile', async () => {
    totalPointsMock.mockResolvedValue({ data: null })
    expect(await confirmUpgrade('rosa@test.local', '123456')).toEqual({
      kind: 'registered',
      pointsRecovered: 0,
    })
  })

  it('maps a wrong/expired code (403) and rate limiting (429)', async () => {
    verifyOtpMock.mockResolvedValue({ error: { status: 403 } })
    expect(await confirmUpgrade('rosa@test.local', '000000')).toEqual({ kind: 'bad_code' })
    verifyOtpMock.mockResolvedValue({ error: { status: 429 } })
    expect(await confirmUpgrade('rosa@test.local', '000000')).toEqual({ kind: 'rate_limited' })
  })
})
