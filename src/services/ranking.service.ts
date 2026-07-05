// Typed fake service (D-007): prototype weekly ranking (data.jsx).
import type { RankingEntry } from '@/types/profile'

const RANKING: RankingEntry[] = [
  { rank: 1, alias: 'el_vecino_z', points: 145, levelId: 3, color: '#ff2e88' },
  { rank: 2, alias: 'lola_rastrea', points: 132, levelId: 3, color: '#2ee6ff' },
  { rank: 3, alias: 'mapache_42', points: 98, levelId: 3, color: '#c6ff3d' },
  { rank: 4, alias: 'curro88', points: 71, levelId: 3, color: '#9b6cf0' },
  { rank: 5, alias: 'rosa_lat', points: 60, levelId: 2, color: '#f5b62e' },
  { rank: 6, alias: 'pyroxine', points: 45, levelId: 2, color: '#e23b3b', isMe: true },
  { rank: 7, alias: 'marta_v', points: 38, levelId: 2, color: '#29c5d6' },
  { rank: 8, alias: 'paco_lat', points: 25, levelId: 1, color: '#8b5cf6' },
  { rank: 9, alias: 'antxon', points: 20, levelId: 1, color: '#ff8a1e' },
  { rank: 10, alias: 'sole_88', points: 15, levelId: 1, color: '#18a558' },
]

export async function getWeeklyRanking(): Promise<RankingEntry[]> {
  return RANKING
}
