import { invitationSeen, markInvitationSeen, shouldInvite } from '@/lib/invitations'
import type { RegistrationState } from '@/lib/registration'

const stateMock = vi.fn<() => Promise<RegistrationState>>()
vi.mock('@/lib/registration', () => ({
  registrationState: () => stateMock(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  stateMock.mockResolvedValue({ kind: 'anonymous' })
})

describe('invitation milestones', () => {
  it('fires once per milestone: unseen → seen sticks across checks', async () => {
    expect(await shouldInvite('first-hunt')).toBe(true)
    markInvitationSeen('first-hunt')
    expect(invitationSeen('first-hunt')).toBe(true)
    expect(await shouldInvite('first-hunt')).toBe(false)
    // milestones are independent
    expect(await shouldInvite('first-confirm')).toBe(true)
  })

  it('never invites a registered user, even unseen', async () => {
    stateMock.mockResolvedValue({ kind: 'registered', email: 'rosa@test.local' })
    expect(await shouldInvite('first-hunt')).toBe(false)
  })

  it('a pending (code sent) session still gets invited — they have not finished', async () => {
    stateMock.mockResolvedValue({ kind: 'pending', email: 'rosa@test.local' })
    expect(await shouldInvite('first-hunt')).toBe(true)
  })

  it('storage failure reads as seen: never risk nagging', async () => {
    const broken = {
      getItem: () => {
        throw new Error('quota')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    vi.stubGlobal('localStorage', broken)
    expect(invitationSeen('first-hunt')).toBe(true)
    expect(await shouldInvite('first-hunt')).toBe(false)
    expect(() => markInvitationSeen('first-hunt')).not.toThrow()
    vi.unstubAllGlobals()
  })
})
