import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/router'
import { resetGeoWatchForTests } from '@/lib/geoWatch'

// The app mounts under <StrictMode> (src/main.tsx), which runs every effect
// twice in development: setup, cleanup, setup. A page whose cleanup marks
// itself dead and whose second setup does not revive it stays blank.
vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  return { ...actual, cameraPermissionState: () => Promise.resolve('granted' as const) }
})

beforeEach(() => {
  resetGeoWatchForTests()
  localStorage.clear()
  localStorage.setItem('lis.geo.granted', '1')
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      watchPosition: (ok: PositionCallback) => {
        const coords = {
          latitude: 40.4116,
          longitude: -3.7102,
          accuracy: 9,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        }
        ok({
          coords: { ...coords, toJSON: () => coords },
          timestamp: Date.now(),
          toJSON: () => ({}),
        })
        return 1
      },
      clearWatch: () => {},
      getCurrentPosition: () => {},
    },
    permissions: { query: () => Promise.resolve({ state: 'granted' }) },
  })
})

afterEach(() => vi.unstubAllGlobals())

it('/cazar renders under StrictMode: the door survives the development double mount', async () => {
  const router = createMemoryRouter(routes, { initialEntries: ['/cazar'] })
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  expect(await screen.findByLabelText(/Galería/)).toBeInTheDocument()
})
