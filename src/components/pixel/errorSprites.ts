// The two sprites of the error screen (LCHP-52, D-068), on the creatures'
// 12 × 13 grid and dark outline. They are not species: nothing here goes
// through SPECIES_IDS, the catalog or the map.
export type ErrorSpriteName = 'glitch' | 'missing'

export const ERROR_SPRITES: Record<ErrorSpriteName, string[]> = {
  glitch: [
    '..K......K.M',
    '...K....K...',
    '..KKKKKKKK..',
    '.KBBBBBBBBK.',
    'KBWPBBBBWWBK',
    'KBWWBBBBWPBK',
    'KBBBBBBBBBBK',
    'CCKBBBBBBBBB',
    'BBKKKKBBBKMM',
    '.KBBBBBBBBK.',
    '..KKKKKKKK..',
    '.K..K..K..K.',
    'K...K..K.C.K',
  ],
  missing: [
    '..KK.KK.KK..',
    '.K........K.',
    'K...........',
    '...........K',
    'K..PP..PP..K',
    'K..PP..PP...',
    '...........K',
    'K..........K',
    'K...........',
    '...........K',
    'K..........K',
    '.K........K.',
    '..KK.KK.KK..',
  ],
}

export const ERROR_SPRITE_PALETTES: Record<ErrorSpriteName, Record<string, string>> = {
  glitch: {
    K: '#241a2e',
    B: '#c9c2d6',
    W: '#fff7ea',
    P: '#241a2e',
    C: '#2ee6ff',
    M: '#ff2e88',
  },
  missing: { K: '#927a66', P: '#241a2e' },
}
