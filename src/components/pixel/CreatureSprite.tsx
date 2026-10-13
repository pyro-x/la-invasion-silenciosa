import type { CSSProperties } from 'react'
import { isSpeciesId, type SpeciesId } from '@/types/species'
import { PixelSprite } from './PixelSprite'
import { SPRITES, SPRITE_PALETTES } from './sprites'

// Drawn for an id this build has no artwork for. The type rules that out,
// but ids also arrive from the database, which can gain a species before
// every client has updated (LCHP-50): a stand-in, never a thrown render.
const UNKNOWN_SPRITE = [
  '............',
  '...XXXXXX...',
  '..XXXXXXXX..',
  '..XXX..XXX..',
  '.......XXX..',
  '......XXX...',
  '.....XXX....',
  '....XXX.....',
  '....XXX.....',
  '............',
  '....XXX.....',
  '....XXX.....',
  '............',
]
const UNKNOWN_PALETTE = { X: '#927a66' }

export function CreatureSprite({
  id,
  scale = 7,
  style,
}: {
  id: SpeciesId
  scale?: number
  style?: CSSProperties
}) {
  const known = isSpeciesId(id)
  return (
    <PixelSprite
      grid={known ? SPRITES[id] : UNKNOWN_SPRITE}
      palette={known ? SPRITE_PALETTES[id] : UNKNOWN_PALETTE}
      scale={scale}
      style={style}
    />
  )
}
