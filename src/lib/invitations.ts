// Registration invitations (LCHP-30, D-055): one prompt per milestone,
// never per session, never for registered users. Copy uses gain+protection
// framing with a stated reason — the endowed-progress evidence (Nunes &
// Drèze 2006) only holds when the reason is real.
import { registrationState } from '@/lib/registration'

export type InvitationMilestone = 'first-hunt' | 'first-confirm'

const KEYS: Record<InvitationMilestone, string> = {
  'first-hunt': 'lis.invite.first-hunt.seen',
  'first-confirm': 'lis.invite.first-confirm.seen',
}

export function invitationSeen(milestone: InvitationMilestone): boolean {
  try {
    return localStorage.getItem(KEYS[milestone]) === '1'
  } catch {
    // storage unavailable (private mode quota): never risk nagging — the
    // passive Perfil floor is always there.
    return true
  }
}

export function markInvitationSeen(milestone: InvitationMilestone): void {
  try {
    localStorage.setItem(KEYS[milestone], '1')
  } catch {
    // best effort only
  }
}

/** True when the milestone prompt should fire: not seen before AND the
 * session is not registered. Marks nothing — the caller decides when. */
export async function shouldInvite(milestone: InvitationMilestone): Promise<boolean> {
  if (invitationSeen(milestone)) return false
  const state = await registrationState()
  return state.kind !== 'registered'
}
