// Pixel-art grids ported verbatim from the prototype (docs/prototype/fuentes/pixel.jsx).
// Each creature grid is 12px wide; nav icons are 7px monochrome ('X' = currentcolor).
import type { SpeciesId } from '@/types/species'

export const SPRITES: Record<SpeciesId, string[]> = {
  candadin: [
    '....KKKK....',
    '...K....K...',
    '..K......K..',
    '..K......K..',
    'KKKKKKKKKKKK',
    'KBBBBBBBBBBK',
    'KBLLBBBBLLBK',
    'KBLKBBBBLKBK',
    'KBBBBBBBBBBK',
    'KBBBBKKBBBBK',
    'KBBBKDDKBBBK',
    'KBBBBKKBBBBK',
    'KKKKKKKKKKKK',
  ],
  turistox: [
    '.....AA.....',
    '.....KA.....',
    '..KKKKKKKK..',
    '.KBBBBBBBBK.',
    'KBWWBBBBWWBK',
    'KBWPBBBBWPBK',
    'KBBBBBBBBBBK',
    'KBKKBKKBKKBK',
    'KBBBBBBBBBBK',
    'KBKKBKKBKKBK',
    'KBBBBBBBBBBK',
    'KBKKBKKBKKBK',
    'KKKKKKKKKKKK',
  ],
  checkinchu: [
    '..KKKKKKKK..',
    '.KBBBBBBBBK.',
    'KBWWBBBBWWBK',
    'KBWPBBBBWPBK',
    'KBBBBBBBBBBK',
    'KBBLLLLLLBBK',
    '.KBBBBBBBBK.',
    '..KKKKKKKK..',
    '....KAAK....',
    '....KAAK....',
    '.....KK.....',
    '...KKKKKK...',
    '..KKKKKKKK..',
  ],
  keymon: [
    '...KKKK.....',
    '..KBBBBK....',
    '.KBWWBWWBK..',
    '.KBWPBWPBK..',
    '.KBBBBBBBK..',
    '..KBBBBK....',
    '...KBBK.....',
    '...KBBK.....',
    '...KBBK.....',
    '...KBBKK....',
    '...KBBKKK...',
    '...KBBKK....',
    '...KKKK.....',
  ],
}

/** Per-character color palettes, from the prototype's CREATURES data. */
export const SPRITE_PALETTES: Record<SpeciesId, Record<string, string>> = {
  candadin: { K: '#241a2e', B: '#f5b62e', D: '#c8881a', L: '#ffe39a' },
  turistox: {
    K: '#241a2e',
    B: '#e23b3b',
    D: '#a01f1f',
    L: '#ffd6d6',
    W: '#fff7ea',
    P: '#241a2e',
    A: '#2ee6ff',
  },
  checkinchu: {
    K: '#241a2e',
    B: '#29c5d6',
    D: '#1b8a96',
    L: '#bff4fa',
    W: '#fff7ea',
    P: '#241a2e',
    A: '#ff2e88',
  },
  keymon: { K: '#241a2e', B: '#9b6cf0', D: '#6a3fc0', L: '#e0d2ff', W: '#fff7ea', P: '#241a2e' },
}

export type NavIconName = 'map' | 'dex' | 'hunt' | 'rank' | 'me'

export const NAV_ICONS: Record<NavIconName, string[]> = {
  map: ['..XXX..', '.XXXXX.', '.XX.XX.', '.XXXXX.', '..XXX..', '...X...', '...X...'],
  dex: ['XXX.XXX', 'XXX.XXX', 'XXX.XXX', '.......', 'XXX.XXX', 'XXX.XXX', 'XXX.XXX'],
  hunt: ['.XX.XX.', 'XXXXXXX', 'XX...XX', 'X.XXX.X', 'XX...XX', 'XXXXXXX', '.......'],
  rank: ['XXXXXXX', '.XXXXX.', '.XXXXX.', '..XXX..', '...X...', '..XXX..', '.XXXXX.'],
  me: ['..XXX..', '..XXX..', '.......', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX'],
}
