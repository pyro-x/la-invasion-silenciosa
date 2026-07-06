// LCHP-12 · The single API-router Edge Function (brief §13, D-037).
// Exactly two client-facing operations exist in the MVP: creating a
// sighting (photo bytes + row, atomically) and minting a short-lived
// signed URL for a photo. Everything else the app does goes straight
// through PostgREST under RLS.
//
// Reserved post-MVP slots (routes deliberately NOT implemented):
//   POST /report-sighting        (fase D — reports)
//   POST /moderation/*           (fase C/D — auto + human moderation)
//   POST /admin/update-config    (fase D — admin)
// /verify-sighting is intentionally absent: verification is a direct
// INSERT under RLS consolidated by a database trigger (D-038); the slot
// returns here only if LCHP-15 finds it needs friendlier errors.
import { verifyCaller } from './lib/auth.ts'
import { corsHeaders, withCors } from './lib/cors.ts'
import { serviceDb } from './lib/db.ts'
import { apiError } from './lib/responses.ts'
import { createSighting } from './routes/create-sighting.ts'
import { getPhotoUrl } from './routes/get-photo-url.ts'

export function routePath(pathname: string): string {
  // Hosted URLs arrive as /api/<route> (function mount); be tolerant of
  // the /functions/v1 prefix local tooling may include.
  return pathname.replace(/^\/functions\/v1/, '').replace(/^\/api/, '') || '/'
}

const KNOWN_ROUTES = new Set(['/create-sighting', '/get-photo-url'])

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const route = routePath(new URL(req.url).pathname)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  try {
    if (!KNOWN_ROUTES.has(route)) {
      return withCors(apiError(404, 'unknown_route', 'Esa ruta no existe'), origin)
    }
    if (req.method !== 'POST') {
      return withCors(apiError(405, 'method_not_allowed', 'Usa POST'), origin)
    }

    const caller = await verifyCaller(req)
    if (!caller) {
      return withCors(apiError(401, 'unauthorized', 'Hace falta una sesión válida'), origin)
    }

    const db = serviceDb()
    const response = route === '/create-sighting'
      ? await createSighting(req, caller, db)
      : await getPhotoUrl(req, db)
    return withCors(response, origin)
  } catch (error) {
    console.error('unhandled api error', error)
    return withCors(apiError(500, 'internal_error', 'Error inesperado, inténtalo de nuevo'), origin)
  }
})
