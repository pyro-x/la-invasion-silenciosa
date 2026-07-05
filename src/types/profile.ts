import type { SpeciesId } from './species'

export type LevelKey = 'explorador' | 'rastreador' | 'cartografo'

export type Level = {
  id: number
  key: LevelKey
  /** Display name (Spanish product copy), e.g. "Explorador". */
  name: string
  minPoints: number
  maxPoints: number
}

export type Profile = {
  alias: string
  points: number
  weekRank: number
  counts: {
    sightings: number
    verifications: number
    videos: number
  }
  perSpecies: Record<SpeciesId, number>
}

export type RankingEntry = {
  rank: number
  alias: string
  points: number
  levelId: number
  /** Avatar accent color from the prototype data. */
  color: string
  isMe?: boolean
}
