// Lazy anonymous session (D-032/D-043): the Edge Function routes require a
// JWT — anonymous sessions included — so the app mints one on the first
// action that needs it (viewing photo evidence today; capture in LCHP-14).
// Map READS stay sessionless (public view). The anonymous user is permanent
// and upgrades to registered later without changing id (LCHP-3 spike).
import { supabase } from '@/lib/supabase'

export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}
