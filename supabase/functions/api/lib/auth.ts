// Caller identity: the JWT from the Authorization header, verified against
// GoTrue with the anon key. Anonymous sessions are first-class citizens
// (D-032): they carry role=authenticated plus is_anonymous=true.
import { createClient } from '@supabase/supabase-js'

export interface Caller {
  id: string
  isAnonymous: boolean
}

export async function verifyCaller(req: Request): Promise<Caller | null> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: { persistSession: false } },
  )
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, isAnonymous: data.user.is_anonymous ?? false }
}
