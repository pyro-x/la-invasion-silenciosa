// Route error boundaries (LCHP-52, D-068). They only choose what to show:
// logging happens once, where the error enters (src/app/errorHandlers.ts),
// because a boundary may render several times for one error.
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { errorReference, toError } from '@/lib/errorReport'
import { ErrorScreen } from './ErrorScreen'

function RouteError({ standalone }: { standalone: boolean }) {
  const thrown = useRouteError()
  if (isRouteErrorResponse(thrown) && thrown.status === 404) {
    return <ErrorScreen variant="notFound" standalone={standalone} />
  }
  return (
    <ErrorScreen
      variant="error"
      reference={errorReference(toError(thrown))}
      standalone={standalone}
    />
  )
}

export function RootErrorBoundary() {
  return <RouteError standalone />
}

export function ShellErrorBoundary() {
  return <RouteError standalone={false} />
}
