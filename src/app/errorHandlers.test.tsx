import { render, screen } from '@testing-library/react'
import {
  createMemoryRouter,
  UNSAFE_ErrorResponseImpl as RouteErrorResponse,
  type Location,
} from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootErrorBoundary } from '@/components/error/RouteErrorBoundary'
import { ERROR_COPY } from '@/components/error/errorCopy'
import { handleRouterError } from './errorHandlers'

const location: Location = { pathname: '/ranking', search: '', hash: '', state: null, key: 'k' }
const info = { location, params: {}, pattern: '/ranking' }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleRouterError', () => {
  it('logs an error that React never saw', () => {
    handleRouterError(new Error('loader failed'), info)
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(vi.mocked(console.error).mock.calls[0][0]).toContain('source: router')
  })

  it('leaves a render error to the root options, which already logged it', () => {
    handleRouterError(new Error('render failed'), {
      ...info,
      errorInfo: { componentStack: '\n    at Broken' },
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('does not log an unknown address as an error', () => {
    handleRouterError(new RouteErrorResponse(404, 'Not Found', null), info)
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('a 404 response thrown by a route', () => {
  it('shows the not-found variant', () => {
    function Gone(): never {
      throw new RouteErrorResponse(404, 'Not Found', null)
    }
    const router = createMemoryRouter(
      [{ ErrorBoundary: RootErrorBoundary, children: [{ path: '/', Component: Gone }] }],
      { initialEntries: ['/'] },
    )
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { name: ERROR_COPY.notFound.title })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ERROR_COPY.retry })).not.toBeInTheDocument()
  })
})
