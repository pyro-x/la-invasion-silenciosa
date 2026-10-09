import { SPRITE_PALETTES, SPRITES, NAV_ICONS } from './sprites'
import { spriteRects } from './spriteShapes'

const letters = (palette: Record<string, string>) => (letter: string) =>
  letter === '.' ? null : (palette[letter] ?? null)

describe('spriteRects', () => {
  it('turns each run of same-coloured cells in a row into one rectangle', () => {
    const rects = spriteRects(['.AA.B', 'AAAAA', '.....'], (l) => (l === '.' ? null : l))
    expect(rects).toEqual([
      { x: 1, y: 0, width: 2, fill: 'A' },
      { x: 4, y: 0, width: 1, fill: 'B' },
      { x: 0, y: 1, width: 5, fill: 'A' },
    ])
  })

  it('starts a new rectangle where the colour changes, with no gap between them', () => {
    const rects = spriteRects(['AABBA'], (l) => l)
    expect(rects.map((r) => [r.x, r.width, r.fill])).toEqual([
      [0, 2, 'A'],
      [2, 2, 'B'],
      [4, 1, 'A'],
    ])
  })

  it('covers exactly the painted cells of every creature and icon', () => {
    const cases: [string[], (letter: string) => string | null][] = [
      ...Object.entries(SPRITES).map(([id, grid]): [string[], (l: string) => string | null] => [
        grid,
        letters(SPRITE_PALETTES[id as keyof typeof SPRITES]),
      ]),
      ...Object.values(NAV_ICONS).map((grid): [string[], (l: string) => string | null] => [
        grid,
        (l) => (l === 'X' ? 'currentColor' : null),
      ]),
    ]
    for (const [grid, resolve] of cases) {
      const painted = grid.flatMap((row, y) =>
        row.split('').flatMap((letter, x) => {
          const fill = resolve(letter)
          return fill === null ? [] : [`${x},${y},${fill}`]
        }),
      )
      const drawn = spriteRects(grid, resolve).flatMap((rect) =>
        Array.from({ length: rect.width }, (_, i) => `${rect.x + i},${rect.y},${rect.fill}`),
      )
      expect(painted.length).toBeGreaterThan(0)
      expect(drawn.sort()).toEqual(painted.sort())
    }
  })
})
