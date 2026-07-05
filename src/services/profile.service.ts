// Typed fake service (D-007): prototype profile, levels and badges (data.jsx).
import type { Badge, Level, Profile } from '@/types/profile'

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
  color: '#e23b3b',
  counts: { sightings: 9, verifications: 3, videos: 1 },
  perSpecies: { candadin: 7, turistox: 5, checkinchu: 2, keymon: 1 },
}

const BADGES: Badge[] = [
  { id: 'first', icon: '★', label: 'Primer hallazgo', earned: true },
  { id: 'lock10', icon: '🔒', label: '10 Candadines', earned: true },
  { id: 'verify', icon: '✔', label: 'Verificador x5', earned: true },
  { id: 'video', icon: '▶', label: 'Vídeo viral', earned: true },
  { id: 'keymon', icon: '♛', label: 'Cazó un Keymon', earned: true },
  { id: 'dex', icon: '◆', label: 'Dex al 50%', earned: false },
  { id: 'night', icon: '☾', label: 'Ronda nocturna', earned: false },
  { id: 'carto', icon: '✦', label: 'Cartógrafo', earned: false },
]

export async function getProfile(): Promise<Profile> {
  return PROFILE
}

export async function getBadges(): Promise<Badge[]> {
  return BADGES
}
