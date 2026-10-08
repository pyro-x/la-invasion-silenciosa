import {
  checkUpgrade,
  registrationState,
  requestUpgrade,
  upgradeRequestedHere,
} from '@/lib/registration'

type SessionUser = { id: string; is_anonymous?: boolean; email?: string; new_email?: string }

const getSessionMock = vi.fn()
const updateUserMock =
  vi.fn<
    (
      attrs: { email: string },
      options: { emailRedirectTo?: string },
    ) => Promise<{ error: { code?: string; status?: number } | null }>
  >()
const refreshSessionMock = vi.fn<
  () => Promise<{
    data: { session: { user: SessionUser } | null }
    error: { status?: number } | null
  }>
>()
const totalPointsMock = vi.fn<() => Promise<{ data: { total_points: number } | null }>>()

vi.mock('@/lib/session', () => ({ ensureSession: () => Promise.resolve() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
      updateUser: (attrs: { email: string }, options: { emailRedirectTo?: string }) =>
        updateUserMock(attrs, options),
      refreshSession: () => refreshSessionMock(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => totalPointsMock() }) }),
    }),
  },
}))

function sessionUser(user: SessionUser | null) {
  getSessionMock.mockResolvedValue({ data: { session: user ? { user } : null } })
}

function refreshedAs(user: SessionUser) {
  refreshSessionMock.mockResolvedValue({ data: { session: { user } }, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionUser({ id: 'u1', is_anonymous: true })
  updateUserMock.mockResolvedValue({ error: null })
  refreshedAs({ id: 'u1', is_anonymous: true, new_email: 'rosa@test.local' })
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
  it('asks for the standard link and sends it back to the origin that asked', async () => {
    expect(await requestUpgrade('rosa@test.local')).toEqual({
      kind: 'sent',
      email: 'rosa@test.local',
    })
    expect(updateUserMock).toHaveBeenCalledWith(
      { email: 'rosa@test.local' },
      { emailRedirectTo: `${window.location.origin}/perfil` },
    )
  })

  it('maps the three named failures and leaves no request behind', async () => {
    updateUserMock.mockResolvedValue({ error: { code: 'email_exists', status: 422 } })
    expect(await requestUpgrade('x@x.com')).toEqual({ kind: 'email_taken' })
    updateUserMock.mockResolvedValue({ error: { code: 'validation_failed', status: 400 } })
    expect(await requestUpgrade('nope')).toEqual({ kind: 'invalid_email' })
    updateUserMock.mockResolvedValue({ error: { status: 429 } })
    expect(await requestUpgrade('x@x.com')).toEqual({ kind: 'rate_limited' })
    expect(upgradeRequestedHere()).toBe(false)
  })

  it('remembers that this browser asked, until the upgrade is celebrated', async () => {
    expect(upgradeRequestedHere()).toBe(false)
    await requestUpgrade('rosa@test.local')
    expect(upgradeRequestedHere()).toBe(true)
    refreshedAs({ id: 'u1', is_anonymous: false, email: 'rosa@test.local' })
    await checkUpgrade()
    expect(upgradeRequestedHere()).toBe(false)
  })
})

describe('checkUpgrade', () => {
  it('stays pending while the link is unopened, keeping the request', async () => {
    await requestUpgrade('rosa@test.local')
    expect(await checkUpgrade()).toEqual({ kind: 'pending' })
    expect(upgradeRequestedHere()).toBe(true)
  })

  it('asks the server, not the stored session, and reports recovered points', async () => {
    totalPointsMock.mockResolvedValue({ data: { total_points: 0 } })
    await requestUpgrade('rosa@test.local')

    sessionUser({ id: 'u1', is_anonymous: true, new_email: 'rosa@test.local' })
    refreshedAs({ id: 'u1', is_anonymous: false, email: 'rosa@test.local' })
    totalPointsMock.mockResolvedValue({ data: { total_points: 15 } })
    expect(await checkUpgrade()).toEqual({
      kind: 'registered',
      email: 'rosa@test.local',
      pointsRecovered: 15,
    })
    expect(refreshSessionMock).toHaveBeenCalledTimes(1)
  })

  it('never reports negative recovery and survives an unreadable profile', async () => {
    totalPointsMock.mockResolvedValue({ data: null })
    await requestUpgrade('rosa@test.local')
    refreshedAs({ id: 'u1', is_anonymous: false, email: 'rosa@test.local' })
    expect(await checkUpgrade()).toEqual({
      kind: 'registered',
      email: 'rosa@test.local',
      pointsRecovered: 0,
    })
  })

  it('reports an upgrade confirmed from a request made elsewhere, with no points claim', async () => {
    refreshedAs({ id: 'u1', is_anonymous: false, email: 'rosa@test.local' })
    totalPointsMock.mockResolvedValue({ data: { total_points: 40 } })
    expect(await checkUpgrade()).toEqual({
      kind: 'registered',
      email: 'rosa@test.local',
      pointsRecovered: 0,
    })
  })

  it('a failed refresh is an error, not a false "not yet"', async () => {
    refreshSessionMock.mockResolvedValue({ data: { session: null }, error: { status: 500 } })
    expect(await checkUpgrade()).toEqual({ kind: 'error' })
  })
})
