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

// Route paths are user-visible → Spanish (D-016); code identifiers stay English.
export const routes = [
  { path: '/', Component: HomePage },
  { path: '/onboarding', Component: OnboardingPage },
  { path: '/cazar', Component: HuntPage },
  {
    Component: AppShell,
    children: [
      { path: '/mapa', Component: MapPage },
      { path: '/especies', Component: SpeciesPage },
      { path: '/especies/:speciesId', Component: SpeciesDetailPage },
      { path: '/ranking', Component: RankingPage },
      { path: '/perfil', Component: ProfilePage },
    ],
  },
]

export const router = createBrowserRouter(routes)
