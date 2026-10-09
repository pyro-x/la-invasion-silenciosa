// Map pins as artwork (LCHP-35). A symbol layer draws icons from images, so
// each creature's tile is described here as an SVG — the same shapes the
// rest of the app draws (D-062) inside the tile the DOM pins had — and the
// browser turns it into the image.
import { SPRITES, SPRITE_PALETTES } from '@/components/pixel/sprites'
import { spriteRects } from '@/components/pixel/spriteShapes'
import type { SpeciesId } from '@/types/species'

export type PinState = 'validated' | 'pending' | 'selected'
export type PinColors = { card: string; line: string; warn: string; accent: string }

export const PIN_SPECIES: readonly SpeciesId[] = ['candadin', 'turistox', 'checkinchu', 'keymon']
export const PIN_STATES: readonly PinState[] = ['validated', 'pending', 'selected']

export const pinName = (species: SpeciesId, state: PinState) => `pin-${species}-${state}`

// CSS pixels. Every state is the same size, so they all anchor on the same
// point: the 34 px tile plus room around it for the selection ring or the
// shadow.
const MARGIN = 3
const TILE = 34
export const PIN_SIZE = TILE + 2 * MARGIN
const BORDER = 2
const RADIUS = 8
const CELL = 2

export function pinSvg(species: SpeciesId, state: PinState, colors: PinColors): string {
  const grid = SPRITES[species]
  const palette = SPRITE_PALETTES[species]
  const border =
    state === 'selected' ? colors.accent : state === 'pending' ? colors.warn : colors.line
  const left = MARGIN + (TILE - grid[0].length * CELL) / 2
  const top = MARGIN + (TILE - grid.length * CELL) / 2
  const cells = spriteRects(grid, (letter) => (letter === '.' ? null : (palette[letter] ?? null)))
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="1" fill="${r.fill}"/>`)
    .join('')
  const inner = TILE - 2 * BORDER
  const around =
    state === 'selected'
      ? `<rect width="${PIN_SIZE}" height="${PIN_SIZE}" rx="${RADIUS + MARGIN}" fill="${colors.accent}"/>`
      : `<rect x="${MARGIN}" y="${MARGIN + 1}" width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="#000" opacity="0.25" filter="url(#soft)"/>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PIN_SIZE} ${PIN_SIZE}">` +
    `<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1"/></filter></defs>` +
    around +
    `<rect x="${MARGIN}" y="${MARGIN}" width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="${border}"/>` +
    `<rect x="${MARGIN + BORDER}" y="${MARGIN + BORDER}" width="${inner}" height="${inner}" rx="${RADIUS - BORDER}" fill="${colors.card}"/>` +
    `<g transform="translate(${left} ${top}) scale(${CELL})" shape-rendering="crispEdges">${cells}</g>` +
    `</svg>`
  )
}

/** The SVG as an image `side` device pixels wide, ready for `map.addImage`. */
export async function rasterisePin(svg: string, side: number): Promise<HTMLImageElement> {
  const image = new Image(side, side)
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  return image
}
