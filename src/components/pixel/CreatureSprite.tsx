import type { CSSProperties } from 'react'
import type { SpeciesId } from '@/types/species'
import { PixelSprite } from './PixelSprite'
import { SPRITES, SPRITE_PALETTES } from './sprites'

export function CreatureSprite({
  id,
  scale = 7,
  style,
}: {
  id: SpeciesId
  scale?: number
  style?: CSSProperties
}) {
  return (
    <PixelSprite grid={SPRITES[id]} palette={SPRITE_PALETTES[id]} scale={scale} style={style} />
  )
}
