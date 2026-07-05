export type SpeciesId = 'candadin' | 'turistox' | 'checkinchu' | 'keymon'

/** Displayed verbatim in the UI (Spanish product copy). */
export type Rarity = 'común' | 'frecuente' | 'raro' | 'legendario'

export type Species = {
  id: SpeciesId
  /** Pokédex-style number, e.g. "001". */
  dexNumber: string
  /** Display name in caps, e.g. "CANDADÍN". */
  name: string
  rarity: Rarity
  /** What it is (Spanish product copy). */
  description: string
  habitat: string
  trackingTip: string
  /** Points awarded to the author when a sighting is validated. */
  points: number
  /** Progress of the current player. */
  found: number
  total: number
}
