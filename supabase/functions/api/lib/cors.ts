// CORS restricted to our real origins: production, Cloudflare Pages
// previews (per-deployment subdomains) and local dev servers.

const EXACT_ORIGINS = new Set([
  'https://la-invasion-silenciosa.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
])

const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.la-invasion-silenciosa\.pages\.dev$/

export function isAllowedOrigin(origin: string): boolean {
  return EXACT_ORIGINS.has(origin) || PREVIEW_ORIGIN.test(origin)
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v)
  return new Response(response.body, { status: response.status, headers })
}
