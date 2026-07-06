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

    if (user.is_anonymous) return { kind: 'saved_provisional' }

    // Did this confirmation tip the threshold? The public view answers; a
    // failed read-back degrades to the modest outcome, never to an error —
    // the verification itself is already stored.
    const { data } = await supabase
      .from('public_map_sightings')
      .select('status')
      .eq('id', sightingId)
      .single()
    return data?.status === 'approved' ? { kind: 'validated' } : { kind: 'counted' }
  } catch {
    return { kind: 'error' }
  }
}
