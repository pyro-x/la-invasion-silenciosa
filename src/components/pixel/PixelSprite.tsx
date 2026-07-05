// Pixel-art renderer ported from the prototype (pixel.jsx): one 1×1 cell
// whose box-shadow paints every pixel of the grid.
import { useMemo, type CSSProperties } from 'react'

function shadowsFor(grid: string[], scale: number, resolve: (ch: string) => string | null): string {
  const out: string[] = []
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]
    for (let x = 0; x < row.length; x++) {
      const col = resolve(row[x])
      if (!col) continue
      out.push(`${x * scale}px ${y * scale}px 0 0 ${col}`)
    }
  }
  return out.join(',')
}

export function PixelSprite({
  grid,
  palette,
  scale = 7,
  style = {},
}: {
  grid: string[]
  palette: Record<string, string>
  scale?: number
  style?: CSSProperties
}) {
  const w = grid[0].length * scale
  const h = grid.length * scale
  const shadow = useMemo(
    () => shadowsFor(grid, scale, (ch) => (ch === '.' ? null : (palette[ch] ?? null))),
    [grid, palette, scale],
  )
  return (
    <div aria-hidden style={{ width: w, height: h, position: 'relative', ...style }}>
      <div
        style={{
          width: scale,
          height: scale,
          background: 'transparent',
          boxShadow: shadow,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  )
}

/** Monochrome grid ('X' cells) painted with currentcolor — inherits text color. */
export function MiniPix({
  grid,
  scale = 4,
  style = {},
}: {
  grid: string[]
  scale?: number
  style?: CSSProperties
}) {
  const w = grid[0].length * scale
  const h = grid.length * scale
  const shadow = useMemo(
    () => shadowsFor(grid, scale, (ch) => (ch === 'X' ? 'currentcolor' : null)),
    [grid, scale],
  )
  return (
    <div
      aria-hidden
      style={{ width: w, height: h, position: 'relative', color: 'inherit', ...style }}
    >
      <div
        style={{
          width: scale,
          height: scale,
          background: 'transparent',
          boxShadow: shadow,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  )
}
