import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { handleRouterError, rootErrorOptions } from '@/app/errorHandlers'
import { routes } from '@/app/router'
import { errorReference } from '@/lib/errorReport'
import { queryClient } from '@/lib/queryClient'
import { APP_VERSION } from '@/lib/version'
import { renderRoute } from '@/test/render'
import { ERROR_COPY } from './errorCopy'
import { RootErrorBoundary } from './RouteErrorBoundary'

const RAW_MESSAGE = "Cannot read properties of undefined (reading 'forEach')"

const broken = vi.hoisted(() => ({ ranking: false, onboarding: false, map: false }))

function fail(): never {
  throw new TypeError(RAW_MESSAGE)
}

vi.mock('@/pages/RankingPage', () => ({
  RankingPage: () => (broken.ranking ? fail() : <div className="screen">Ranking semanal</div>),
}))
vi.mock('@/pages/OnboardingPage', () => ({
  OnboardingPage: () => (broken.onboarding ? fail() : <div>La misión</div>),
}))
vi.mock('@/pages/MapPage', () => ({
  MapPage: () => (broken.map ? fail() : <div className="screen">El mapa</div>),
}))

const reference = errorReference(new TypeError(RAW_MESSAGE))

function tabBar() {
  return screen.queryByRole('navigation', { name: 'Navegación principal' })
}

beforeEach(() => {
  broken.ranking = false
  broken.onboarding = false
  broken.map = false
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a render error on a page inside the shell', () => {
  beforeEach(() => {
    broken.ranking = true
  })

  it('shows the app error screen with its reference code and none of the raw error', () => {
    renderRoute('/ranking')
    expect(screen.getByRole('heading', { name: ERROR_COPY.error.title })).toBeInTheDocument()
    expect(screen.getByText(reference)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Unexpected Application Error')
    expect(document.body).not.toHaveTextContent('forEach')
    expect(document.body).not.toHaveTextContent('TypeError')
  })

  it('keeps the tab bar, and a tab leaves the failed page', async () => {
    const user = userEvent.setup()
    renderRoute('/ranking')
    expect(tabBar()).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /mapa/i }))
    expect(await screen.findByText('El mapa')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: ERROR_COPY.error.title })).not.toBeInTheDocument()
  })

  it('«Reintentar» drops the cached remote data and renders the route again', async () => {
    const user = userEvent.setup()
    queryClient.setQueryData(['cached'], 'stale')
    renderRoute('/ranking', queryClient)
    broken.ranking = false
    await user.click(screen.getByRole('button', { name: ERROR_COPY.retry }))
    expect(await screen.findByText('Ranking semanal')).toBeInTheDocument()
    expect(queryClient.getQueryData(['cached'])).toBeUndefined()
  })

  it('«Reintentar» shows the error screen again when the page still fails', async () => {
    const user = userEvent.setup()
    renderRoute('/ranking')
    await user.click(screen.getByRole('button', { name: ERROR_COPY.retry }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: ERROR_COPY.error.title })).toHaveFocus(),
    )
    expect(tabBar()).toBeInTheDocument()
  })

  it('moves focus from the tab that opened the page to the title', async () => {
    const user = userEvent.setup()
    broken.ranking = false
    renderRoute('/mapa')
    broken.ranking = true
    const tab = screen.getByRole('link', { name: /ranking/i })
    await user.click(tab)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: ERROR_COPY.error.title })).toHaveFocus(),
    )
    expect(tab).not.toHaveFocus()
  })

  it('«Volver al mapa» goes to the map', async () => {
    const user = userEvent.setup()
    renderRoute('/ranking')
    await user.click(screen.getByRole('button', { name: ERROR_COPY.backToMap }))
    expect(await screen.findByText('El mapa')).toBeInTheDocument()
  })
})

describe('a render error on the map', () => {
  it('offers the start screen instead of the map', async () => {
    broken.map = true
    const user = userEvent.setup()
    const router = renderRoute('/mapa')
    expect(screen.queryByRole('button', { name: ERROR_COPY.backToMap })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: ERROR_COPY.backToStart }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.getByRole('button', { name: /empezar la misión/i })).toBeInTheDocument()
  })
})

describe('a render error on the map reached with a trailing slash', () => {
  it('still offers the start screen', () => {
    broken.map = true
    renderRoute('/mapa/')
    expect(screen.getByRole('button', { name: ERROR_COPY.backToStart })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ERROR_COPY.backToMap })).not.toBeInTheDocument()
  })
})

describe('a render error on a page outside the shell', () => {
  it('shows the error screen in the app frame, without a tab bar', async () => {
    broken.onboarding = true
    const user = userEvent.setup()
    renderRoute('/onboarding')
    expect(screen.getByRole('heading', { name: ERROR_COPY.error.title })).toBeInTheDocument()
    expect(document.querySelector('.app-root')).toBeInTheDocument()
    expect(tabBar()).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('forEach')
    await user.click(screen.getByRole('button', { name: ERROR_COPY.backToMap }))
    expect(await screen.findByText('El mapa')).toBeInTheDocument()
  })
})

describe('a thrown value that is not an error', () => {
  it('shows the error screen and is logged once with the same code', async () => {
    const thrown: object = Object.create(null)
    function Hostile(): never {
      throw thrown
    }
    const container = document.createElement('div')
    document.body.append(container)
    const router = createMemoryRouter(
      [{ ErrorBoundary: RootErrorBoundary, children: [{ path: '/', Component: Hostile }] }],
      { initialEntries: ['/'] },
    )
    const root = createRoot(container, rootErrorOptions)
    await act(async () => {
      root.render(<RouterProvider router={router} onError={handleRouterError} />)
    })

    const code = errorReference(new Error('A value that is not an error was thrown'))
    expect(within(container).getByText(code)).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(vi.mocked(console.error).mock.calls[0][0]).toContain(`error ${code}`)

    act(() => root.unmount())
    container.remove()
  })
})

describe('with nothing around the router', () => {
  it('still renders the error screen', () => {
    broken.ranking = true
    const router = createMemoryRouter(routes, { initialEntries: ['/ranking'] })
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('heading', { name: ERROR_COPY.error.title })).toBeInTheDocument()
  })
})

describe('an unknown address', () => {
  it('shows the not-found variant inside the shell', async () => {
    const user = userEvent.setup()
    renderRoute('/no-existe/de-verdad')
    expect(screen.getByRole('heading', { name: ERROR_COPY.notFound.title })).toHaveFocus()
    expect(within(tabBar()!).getByText('Especies')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ERROR_COPY.retry })).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(ERROR_COPY.referenceLabel))).not.toBeInTheDocument()
    expect(console.error).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: ERROR_COPY.backToMap }))
    expect(await screen.findByText('El mapa')).toBeInTheDocument()
  })
})

describe('the console entry', () => {
  let root: Root
  let container: HTMLElement

  async function mount(path: string) {
    container = document.createElement('div')
    document.body.append(container)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    root = createRoot(container, rootErrorOptions)
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} onError={handleRouterError} />
        </QueryClientProvider>,
      )
    })
  }

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('is written once per render error, with the code the screen shows', async () => {
    broken.ranking = true
    await mount('/ranking')

    expect(within(container).getByText(reference)).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledTimes(1)
    const [entry, error] = vi.mocked(console.error).mock.calls[0]
    expect(entry).toContain(`error ${reference}`)
    expect(entry).toContain(`version: ${APP_VERSION}`)
    expect(entry).toContain(`route: ${window.location.pathname}`)
    expect(entry).toContain('source: caught')
    expect(entry).toContain(`stack: TypeError: ${RAW_MESSAGE}`)
    expect(entry).toMatch(/component stack: .*RankingPage/s)
    expect(error).toBeInstanceOf(TypeError)
  })

  it('is written again for the error of a failed retry, and not for a page that works', async () => {
    broken.ranking = true
    const user = userEvent.setup()
    await mount('/ranking')
    await user.click(within(container).getByRole('button', { name: ERROR_COPY.retry }))
    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(2))

    broken.ranking = false
    await user.click(within(container).getByRole('button', { name: ERROR_COPY.retry }))
    expect(await within(container).findByText('Ranking semanal')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})
