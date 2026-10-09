// Pixel-art renderer: the prototype's letter grids (pixel.jsx) drawn as an
// inline SVG, so they stay sharp at any size (LCHP-41).
import { useMemo, type CSSProperties } from 'react'
import { spriteRects, type SpriteRect } from './spriteShapes'

function Sprite({
  grid,
  rects,
  scale,
  style,
}: {
  grid: string[]
  rects: SpriteRect[]
  scale: number
  style: CSSProperties
}) {
  const columns = Math.max(...grid.map((row) => row.length))
  const rows = grid.length
  return (
    <svg
      aria-hidden
      width={columns * scale}
      height={rows * scale}
      viewBox={`0 0 ${columns} ${rows}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  )
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
  const rects = useMemo(
    () => spriteRects(grid, (letter) => (letter === '.' ? null : (palette[letter] ?? null))),
    [grid, palette],
  )
  return <Sprite grid={grid} rects={rects} scale={scale} style={style} />
}

/** Monochrome grid ('X' cells) painted with currentColor — inherits text color. */
export function MiniPix({
  grid,
  scale = 4,
  style = {},
}: {
  grid: string[]
  scale?: number
  style?: CSSProperties
}) {
  const rects = useMemo(
    () => spriteRects(grid, (letter) => (letter === 'X' ? 'currentColor' : null)),
    [grid],
  )
  return <Sprite grid={grid} rects={rects} scale={scale} style={{ color: 'inherit', ...style }} />
}
