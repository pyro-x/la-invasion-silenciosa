// A letter grid as SVG shapes (LCHP-41): one rectangle per run of cells of
// the same colour along a row, in grid units. Pure, so anything that needs
// the artwork as a vector — the React components, the map pins — builds on
// the same shapes.
export type SpriteRect = { x: number; y: number; width: number; fill: string }

export function spriteRects(
  grid: readonly string[],
  resolve: (letter: string) => string | null,
): SpriteRect[] {
  const rects: SpriteRect[] = []
  grid.forEach((row, y) => {
    let run: SpriteRect | null = null
    for (let x = 0; x < row.length; x++) {
      const fill = resolve(row[x])
      if (run && fill === run.fill) {
        run.width++
        continue
      }
      run = fill ? { x, y, width: 1, fill } : null
      if (run) rects.push(run)
    }
  })
  return rects
}
