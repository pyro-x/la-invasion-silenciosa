// Typed fake service (D-007): prototype profile and levels (data.jsx).
import type { Level, Profile } from '@/types/profile'

export const LEVELS: Level[] = [
  { id: 1, key: 'explorador', name: 'Explorador', minPoints: 0, maxPoints: 30 },
  { id: 2, key: 'rastreador', name: 'Rastreador', minPoints: 31, maxPoints: 60 },
  { id: 3, key: 'cartografo', name: 'Cartógrafo', minPoints: 61, maxPoints: 9999 },
]

export function levelForPoints(points: number): Level {
  return (
    LEVELS.find((l) => points >= l.minPoints && points <= l.maxPoints) ?? LEVELS[LEVELS.length - 1]
  )
}

const PROFILE: Profile = {
  alias: 'pyroxine',
  points: 45,
  weekRank: 6,
  counts: { sightings: 9, verifications: 3, videos: 1 },
  perSpecies: { candadin: 7, turistox: 5, checkinchu: 2, keymon: 1 },
}

export async function getProfile(): Promise<Profile> {
  return PROFILE
}
