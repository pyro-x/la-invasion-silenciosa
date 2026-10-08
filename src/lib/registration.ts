// Progressive registration (LCHP-29, D-055, D-060): the anonymous session
// upgrades to a registered account by confirming an email. The flow is
// updateUser({ email }) → Supabase's standard confirmation LINK arrives →
// the neighbor opens it → the SAME auth.users row is confirmed server-side
// (LCHP-3): points, sightings and provisional confirmations survive, and
// the LCHP-15 trigger activates the latter the moment is_anonymous flips.
//
// The link may open in a browser that does not hold this session (on iOS an
// installed PWA and Safari do not share storage), so the app never depends
// on the redirect: it asks the server whether the upgrade happened, by
// refreshing its own session, when the neighbor comes back.
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export type RegistrationState =
  | { kind: 'anonymous' }
  /** Link sent, not confirmed yet — the session stays fully usable. */
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

// Marks that this browser asked for a link, with the points held at that
// moment: the upgrade is confirmed server-side, possibly while this app is
// closed, so this is how the app knows there is something to celebrate and
// how many points it recovered. Empty value = points were unreadable.
const REQUEST_KEY = 'lis.registration.requested'

function rememberRequest(pointsBefore: number | null) {
  try {
    localStorage.setItem(REQUEST_KEY, pointsBefore === null ? '' : String(pointsBefore))
  } catch {
    // Storage unavailable: the upgrade still works, it just isn't celebrated.
  }
}

/** True while a link requested from this browser has not been celebrated. */
export function upgradeRequestedHere(): boolean {
  try {
    return localStorage.getItem(REQUEST_KEY) !== null
  } catch {
    return false
  }
}

function takeRequestedPoints(): number | null {
  try {
    const stored = localStorage.getItem(REQUEST_KEY)
    localStorage.removeItem(REQUEST_KEY)
    if (!stored) return null
    const points = Number(stored)
    return Number.isFinite(points) ? points : null
  } catch {
    return null
  }
}

export async function requestUpgrade(email: string): Promise<UpgradeRequestResult> {
  try {
    await ensureSession()
    const before = await ownTotalPoints()
    // Land back on the origin that asked (production or a preview build);
    // without it the link goes to the project's Site URL.
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/perfil` },
    )
    if (!error) {
      rememberRequest(before)
      return { kind: 'sent', email }
    }
    if (error.code === 'email_exists') return { kind: 'email_taken' }
    if (error.code === 'validation_failed') return { kind: 'invalid_email' }
    if (error.status === 429) return { kind: 'rate_limited' }
    return { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}

export type UpgradeCheckResult =
  /** Upgraded; pointsRecovered > 0 when LCHP-15's trigger paid out retroactively. */
  | { kind: 'registered'; email: string; pointsRecovered: number }
  /** The link has not been opened yet. */
  | { kind: 'pending' }
  | { kind: 'error' }

/**
 * Asks the server whether the link was confirmed. Refreshing — not just
 * reading — the session matters twice: the stored user predates the
 * confirmation, and the new access token is the one whose claims say
 * "not anonymous", which RLS reads.
 */
export async function checkUpgrade(): Promise<UpgradeCheckResult> {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) return { kind: 'error' }
    const user = data.session?.user
    if (!user || user.is_anonymous !== false || !user.email) return { kind: 'pending' }
    const before = takeRequestedPoints()
    const after = await ownTotalPoints()
    const pointsRecovered = before !== null && after !== null ? Math.max(0, after - before) : 0
    return { kind: 'registered', email: user.email, pointsRecovered }
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
  const { data } = await supabase.from('profiles').select('total_points').eq('id', userId).single()
  return data?.total_points ?? null
}
