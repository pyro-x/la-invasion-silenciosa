// Everything the app says about an unexpected error goes through here
// (LCHP-52, D-068): the reference code the error screen shows and the one
// console entry a developer reads. A reporting service, if one is ever
// approved, plugs into reportError and nothing else changes.
import { isRouteErrorResponse } from 'react-router'
import { APP_VERSION } from '@/lib/version'

export type ErrorSource = 'uncaught' | 'caught' | 'recoverable' | 'router'

export type ErrorReport = {
  reference: string
  version: string
  route: string
  source: ErrorSource
  error: Error
  componentStack: string | null
}

// No I, L, O or U: the code is read aloud or typed from a phone screen.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

// Never throws: it runs inside the error screen and the logger. A value
// with no usable string form (a null-prototype object, a toString that
// throws) gets a fixed description.
export function toError<Thrown>(thrown: Thrown): Error {
  if (thrown instanceof Error) return thrown
  if (isRouteErrorResponse(thrown)) return new Error(`${thrown.status} ${thrown.statusText}`)
  try {
    return new Error(String(thrown))
  } catch {
    return new Error('A value that is not an error was thrown')
  }
}

// Derived from the build and the failure, not random: the screen and the
// console agree without sharing state, and the same failure on the same
// build gives the same code on every device with the same browser engine.
export function errorReference(error: Error, version: string = APP_VERSION): string {
  const text = `${version}|${error.name}|${error.message}`
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193)
  }
  let code = ''
  for (let position = 0; position < 6; position++) {
    code += ALPHABET[(hash >>> (position * 5)) & 31]
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`
}

export function reportError({
  error,
  componentStack,
  source,
}: {
  error: Error
  componentStack?: string | null
  source: ErrorSource
}): ErrorReport {
  const report: ErrorReport = {
    reference: errorReference(error),
    version: APP_VERSION,
    // The pathname only: a query string or a hash is never needed to find
    // the failing screen, and leaving them out keeps the entry free of
    // whatever a future link might carry. This function adds nothing about
    // the user; the error's own message and stack are logged as thrown.
    route: window.location.pathname,
    source,
    error,
    componentStack: componentStack?.trim() || null,
  }
  console.error(
    [
      `[La Invasión Silenciosa] error ${report.reference}`,
      `version: ${report.version}`,
      `route: ${report.route}`,
      `source: ${report.source}`,
      `stack: ${error.stack ?? `${error.name}: ${error.message}`}`,
      `component stack: ${report.componentStack ?? 'not available'}`,
    ].join('\n'),
    error,
  )
  return report
}
