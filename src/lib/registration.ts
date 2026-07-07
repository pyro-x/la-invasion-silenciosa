// Progressive registration (LCHP-29, D-055): the anonymous session upgrades
// to a registered account via an email OTP CODE, never a clickable link — a
// link opens in Safari, which does not share storage with an installed PWA
// on iOS, stranding the session (LCHP-29 research). The flow is
// updateUser({ email }) → 6-digit code arrives → verifyOtp('email_change'),
// all on the SAME auth.users row (verified in LCHP-3): points, sightings and
// provisional confirmations survive, and the LCHP-15 trigger activates the
// latter the moment is_anonymous flips.
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export type RegistrationState =
  | { kind: 'anonymous' }
  /** Code sent, upgrade not confirmed yet — the session stays fully usable. */
  | { kind: 'pending'; email: string }
  | { kind: 'registered'; email: string }

export async function registrationState(): Promise<RegistrationState> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return { kind: 'anonymous' }
  if (user.is_anonymous === false && user.email) {
    return { kind: 'registered', email: user.email }
  }
  if (user.new_email) return { kind: 'pending', email: user.new_email }
  return { kind: 'anonymous' }
}

export type UpgradeRequestResult =
  | { kind: 'sent'; email: string }
  | { kind: 'email_taken' }
  | { kind: 'invalid_email' }
  | { kind: 'rate_limited' }
  | { kind: 'error' }

export async function requestUpgrade(email: string): Promise<UpgradeRequestResult> {
  try {
    await ensureSession()
    const { error } = await supabase.auth.updateUser({ email })
    if (!error) return { kind: 'sent', email }
    if (error.code === 'email_exists') return { kind: 'email_taken' }
    if (error.code === 'validation_failed') return { kind: 'invalid_email' }
    if (error.status === 429) return { kind: 'rate_limited' }
    return { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}

export type ConfirmUpgradeResult =
  /** Upgraded; pointsRecovered > 0 when LCHP-15's trigger paid out retroactively. */
  | { kind: 'registered'; pointsRecovered: number }
  | { kind: 'bad_code' }
  | { kind: 'rate_limited' }
  | { kind: 'error' }

export async function confirmUpgrade(email: string, token: string): Promise<ConfirmUpgradeResult> {
  try {
    const before = await ownTotalPoints()
    const { error } = await supabase.auth.verifyOtp({ type: 'email_change', email, token })
    if (error) {
      // GoTrue answers 403 otp_expired for both wrong and expired codes.
      if (error.status === 403) return { kind: 'bad_code' }
      if (error.status === 429) return { kind: 'rate_limited' }
      return { kind: 'error' }
    }
    const after = await ownTotalPoints()
    const pointsRecovered =
      before !== null && after !== null ? Math.max(0, after - before) : 0
    return { kind: 'registered', pointsRecovered }
  } catch {
    return { kind: 'error' }
  }
}

/** The REAL points cache (profiles is own-row readable under RLS); null when
 * unreadable — the recovered-points toast just won't show a number. */
async function ownTotalPoints(): Promise<number | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) return null
  const { data } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', userId)
    .single()
  return data?.total_points ?? null
}
