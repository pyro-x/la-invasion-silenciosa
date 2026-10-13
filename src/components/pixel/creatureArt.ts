import { isSpeciesId } from '@/types/species'
import { SPRITES, SPRITE_PALETTES } from './sprites'

export type CreatureArt = { grid: string[]; palette: Record<string, string> }

// Drawn for an id this build has no artwork for. The type rules that out,
// but ids also arrive from the database, which can gain a species before
// every client has updated (LCHP-50): a stand-in, never a thrown render.
const UNKNOWN_ART: CreatureArt = {
  grid: [
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
  ],
  palette: { X: '#927a66' },
}

export function creatureArt(id: string): CreatureArt {
  return isSpeciesId(id) ? { grid: SPRITES[id], palette: SPRITE_PALETTES[id] } : UNKNOWN_ART
}
