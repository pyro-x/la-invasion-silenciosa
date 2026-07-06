// JSON response helpers and the API error contract (brief §13 mirrors this).
// `error` is a machine-readable code for the app; `message` is the Spanish
// string a user may see verbatim.

export type ApiErrorCode =
  | 'unknown_route'
  | 'method_not_allowed'
  | 'unauthorized'
  | 'invalid_payload'
  | 'unknown_species'
  | 'out_of_bounds'
  | 'invalid_image'
  | 'image_too_large'
  | 'daily_quota_exceeded'
  | 'not_found'
  | 'internal_error'

export function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function apiError(status: number, code: ApiErrorCode, message: string): Response {
  return json(status, { error: code, message })
}
