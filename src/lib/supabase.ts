// The single Supabase browser client. Uses the public anon key (brief §11):
// real security is RLS, so this key ships in the frontend by design. The
// URL + key are injected per environment (see .env / Cloudflare Pages vars)
// so a build is not tied to one project.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env (local) or set them in the Cloudflare Pages environment.',
  )
}

export const supabase = createClient<Database>(url, anonKey)
