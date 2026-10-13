import type { CSSProperties } from 'react'
import type { SpeciesId } from '@/types/species'
import { creatureArt } from './creatureArt'
import { PixelSprite } from './PixelSprite'

export function CreatureSprite({
  id,
  scale = 7,
  style,
}: {
  id: SpeciesId
  scale?: number
  style?: CSSProperties
}) {
  const { grid, palette } = creatureArt(id)
  return <PixelSprite grid={grid} palette={palette} scale={scale} style={style} />
}
