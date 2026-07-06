// The single Supabase browser client. Uses the public anon key (brief §11):
// real security is RLS, so this key ships in the frontend by design. The
// URL + key are injected per environment (see .env / Cloudflare Pages vars)
// so a build is not tied to one project.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Do NOT throw at import when the env is missing: that would white-screen
// EVERY route (and break CI/tests, which have no .env) instead of degrading
// only the data-backed screens. A missing env instead surfaces as the map's
// «no se pudieron cargar» error state (data requests to the placeholder fail).
// createClient needs a syntactically valid URL, hence the harmless fallback.
if (!url || !anonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in .env (local) or the Cloudflare Pages environment (both Production AND Preview). Data screens will show their error state until they are set.',
  )
}

export const supabase = createClient<Database>(
  url || 'http://supabase-env-missing.invalid',
  anonKey || 'anon-key-env-missing',
)
