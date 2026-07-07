// Community verification (LCHP-15, D-054): the ONE direct client write path
// (D-037/D-038). The INSERT is the whole request — every sensitive
// consequence (counting, threshold, pending → approved, +10/+5 points)
// happens in Postgres triggers behind RLS, so this service only reports
// what happened. Anonymous sessions can confirm too: their support is
// stored as provisional and activates retroactively when they register.
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export type VerifyOutcome =
  /** Threshold reached — the sighting is now approved, points minted. */
  | { kind: 'validated' }
  /** Registered confirmation stored and counting, still below threshold. */
  | { kind: 'counted' }
  /** Anonymous confirmation stored as provisional support (D-054). */
  | { kind: 'saved_provisional' }
  /** UNIQUE (sighting_id, user_id): this user already verified it. */
  | { kind: 'already_verified' }
  /** RLS said no: own sighting, or it is no longer pending. */
  | { kind: 'not_verifiable' }
  | { kind: 'error' }

/** Own stored confirmations not yet paid AND still able to pay — the
 * neighbor's pending value (LCHP-30's Perfil banner: «N apoyos y +N×5
 * puntos esperando»). RLS scopes the first read to the caller's rows; the
 * second filters through the public map view, which only serves pending and
 * approved sightings — a confirmation whose sighting was rejected/removed
 * will never pay out (Codex review: promising those +5s would be a false
 * incentive), so it must not be counted. Without a session there is nothing
 * to count, and none is ever minted just for this. */
export async function countOwnProvisionalConfirmations(): Promise<number> {
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return 0
    const { data: rows } = await supabase
      .from('verifications')
      .select('sighting_id')
      .eq('type', 'confirm_exists')
      .eq('points_awarded', false)
    const ids = (rows ?? []).flatMap((row) => (row.sighting_id ? [row.sighting_id] : []))
    if (ids.length === 0) return 0
    const { count } = await supabase
      .from('public_map_sightings')
      .select('id', { count: 'exact', head: true })
      .in('id', ids)
    return count ?? 0
  } catch {
    return 0
  }
}

export async function submitVerification(sightingId: string): Promise<VerifyOutcome> {
  try {
    await ensureSession()
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return { kind: 'error' }

    const { error } = await supabase.from('verifications').insert({
      sighting_id: sightingId,
      user_id: user.id,
      type: 'confirm_exists',
    })
    if (error) {
      if (error.code === '23505') return { kind: 'already_verified' }
      if (error.code === '42501') return { kind: 'not_verifiable' }
      return { kind: 'error' }
    }

    // The outcome comes from authoritative post-insert state, not from local
    // assumptions (Codex review round 2): with the operational switch open,
    // an anonymous confirmation counts and can validate — the public view is
    // what knows. A failed read-back degrades to the modest outcome, never
    // to an error: the verification itself is already stored. One honest
    // approximation remains: an anonymous confirmation that counted but sits
    // below a threshold > 1 (non-default config) still reads as provisional —
    // the trigger stays authoritative and the points appear on validation.
    const { data } = await supabase
      .from('public_map_sightings')
      .select('status')
      .eq('id', sightingId)
      .single()
    if (data?.status === 'approved') return { kind: 'validated' }
    return user.is_anonymous ? { kind: 'saved_provisional' } : { kind: 'counted' }
  } catch {
    return { kind: 'error' }
  }
}
