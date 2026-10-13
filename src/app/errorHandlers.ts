// Where errors enter the log (LCHP-52, D-068). React reports every render
// error through the root options; the router reports loader and navigation
// errors, which React never sees, plus the render errors its boundary
// caught — those arrive with `errorInfo` and are skipped here, so each
// error is logged once.
import type { RootOptions } from 'react-dom/client'
import { isRouteErrorResponse, type RouterProviderProps } from 'react-router'
import { reportError, toError, type ErrorSource } from '@/lib/errorReport'

type RootErrorHandler = NonNullable<RootOptions['onCaughtError']>

function reportFromReact(source: ErrorSource): RootErrorHandler {
  return (error, errorInfo) => {
    reportError({ error: toError(error), componentStack: errorInfo.componentStack, source })
  }
}

export const rootErrorOptions = {
  onUncaughtError: reportFromReact('uncaught'),
  onCaughtError: reportFromReact('caught'),
  onRecoverableError: reportFromReact('recoverable'),
} satisfies RootOptions

export const handleRouterError: NonNullable<RouterProviderProps['onError']> = (error, info) => {
  if (info.errorInfo) return
  if (isRouteErrorResponse(error) && error.status === 404) return
  reportError({ error: toError(error), source: 'router' })
}
