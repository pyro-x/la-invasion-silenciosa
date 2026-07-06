import { assertEquals } from '@std/assert'
import { corsHeaders, isAllowedOrigin } from './cors.ts'

Deno.test('production, previews and local dev are allowed', () => {
  assertEquals(isAllowedOrigin('https://la-invasion-silenciosa.pages.dev'), true)
  assertEquals(isAllowedOrigin('https://cbea82a5.la-invasion-silenciosa.pages.dev'), true)
  assertEquals(isAllowedOrigin('http://localhost:5173'), true)
})

Deno.test('foreign and lookalike origins are rejected', () => {
  assertEquals(isAllowedOrigin('https://evil.com'), false)
  assertEquals(isAllowedOrigin('https://la-invasion-silenciosa.pages.dev.evil.com'), false)
  assertEquals(isAllowedOrigin('http://la-invasion-silenciosa.pages.dev'), false) // http, not https
  assertEquals(isAllowedOrigin(''), false)
})

Deno.test('no Origin means no CORS headers (curl still works)', () => {
  assertEquals(corsHeaders(null), {})
  assertEquals(corsHeaders('https://evil.com'), {})
  const headers = corsHeaders('https://la-invasion-silenciosa.pages.dev')
  assertEquals(headers['Access-Control-Allow-Origin'], 'https://la-invasion-silenciosa.pages.dev')
})
