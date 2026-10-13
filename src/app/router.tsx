import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from '@/pages/HomePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { MapPage } from '@/pages/MapPage'
import { SpeciesPage } from '@/pages/SpeciesPage'
import { SpeciesDetailPage } from '@/pages/SpeciesDetailPage'
import { HuntPage } from '@/pages/HuntPage'
import { RankingPage } from '@/pages/RankingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CreditsPage } from '@/pages/CreditsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RootErrorBoundary, ShellErrorBoundary } from '@/components/error/RouteErrorBoundary'

// Route paths are user-visible → Spanish (D-016); code identifiers stay English.
// Two error boundaries (LCHP-52, D-068): the root one catches everything,
// the one inside AppShell keeps the tab bar on screen when a page fails.
// The splat route sits inside the shell so an unknown address keeps it too.
export const routes = [
  {
    ErrorBoundary: RootErrorBoundary,
    children: [
      { path: '/', Component: HomePage },
      { path: '/onboarding', Component: OnboardingPage },
      { path: '/cazar', Component: HuntPage },
      {
        Component: AppShell,
        children: [
          {
            ErrorBoundary: ShellErrorBoundary,
            children: [
              { path: '/mapa', Component: MapPage },
              { path: '/especies', Component: SpeciesPage },
              { path: '/especies/:speciesId', Component: SpeciesDetailPage },
              { path: '/ranking', Component: RankingPage },
              { path: '/perfil', Component: ProfilePage },
              { path: '/perfil/creditos', Component: CreditsPage },
              { path: '*', Component: NotFoundPage },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
