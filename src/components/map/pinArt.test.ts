import { ARRIVAL_MS, arrivalOpacities, blinkDelayMs, blinkOpacity, BLINK_MS } from './blink'
import { PIN_SIZE, PIN_SPECIES, PIN_STATES, pinName, pinSvg } from './pinArt'

const colors = { card: '#fffdf8', line: '#ddccaf', warn: '#e07a16', accent: '#a00000' }

describe('pinSvg', () => {
  it('draws the creature from the shared artwork, inside a tile in the theme colours', () => {
    const svg = pinSvg('candadin', 'validated', colors)
    expect(svg).toContain(`viewBox="0 0 ${PIN_SIZE} ${PIN_SIZE}"`)
    expect(svg).toContain('fill="#ddccaf"')
    expect(svg).toContain('fill="#fffdf8"')
    // candadín's outline and body, as CreatureSprite draws them
    expect(svg).toContain('fill="#241a2e"')
    expect(svg).toContain('fill="#f5b62e"')
    expect(svg).toContain('shape-rendering="crispEdges"')
  })

  it('tells the three states apart by the tile, not by the creature', () => {
    const body = (svg: string) => svg.slice(svg.indexOf('<g '))
    const validated = pinSvg('keymon', 'validated', colors)
    const pending = pinSvg('keymon', 'pending', colors)
    const selected = pinSvg('keymon', 'selected', colors)
    expect(body(pending)).toBe(body(validated))
    expect(body(selected)).toBe(body(validated))
    expect(pending).toContain('fill="#e07a16"')
    expect(validated).not.toContain('#e07a16')
    // the selection ring fills the whole image; the others cast a soft shadow
    expect(selected).toContain(`<rect width="${PIN_SIZE}" height="${PIN_SIZE}"`)
    expect(selected).not.toContain('filter="url(#soft)"')
    expect(validated).toContain('filter="url(#soft)"')
  })

  it('names one image per creature and state', () => {
    const names = PIN_SPECIES.flatMap((species) =>
      PIN_STATES.map((state) => pinName(species, state)),
    )
    expect(new Set(names).size).toBe(12)
    expect(names).toContain('pin-turistox-selected')
  })
})

describe('the pending blink', () => {
  it('is at the opacity the CSS animation draws: whole, a quarter at half a cycle, eased between', () => {
    expect(blinkOpacity(0)).toBeCloseTo(1)
    expect(blinkOpacity(BLINK_MS / 2)).toBeCloseTo(0.25)
    expect(blinkOpacity(BLINK_MS * 7.5)).toBeCloseTo(0.25)
    // half way down and half way up: ease-in-out is symmetric
    expect(blinkOpacity(BLINK_MS / 4)).toBeCloseTo(0.625)
    expect(blinkOpacity((BLINK_MS * 3) / 4)).toBeCloseTo(0.625)
    // slow at the ends: an eighth of the cycle in, it has barely moved
    expect(blinkOpacity(BLINK_MS / 16)).toBeGreaterThan(0.97)
  })

  it('a twin arrives whole and ends on the blink, with no jump on the way', () => {
    for (const now of [0, 350, 700, 1050, 1399]) {
      const opacities = arrivalOpacities(now)
      expect(opacities.at(0)).toBeCloseTo(1)
      expect(opacities.at(-1)).toBeCloseTo(blinkOpacity(now + ARRIVAL_MS))
      // a quarter of the way it has let go of little: it eases out, like the blink
      const blink = blinkOpacity(now + ARRIVAL_MS / 4)
      expect(opacities.at(3)).toBeCloseTo(blink + (1 - blink) * 0.871, 2)
      const steps = opacities.slice(1).map((opacity, i) => Math.abs(opacity - (opacities[i] ?? 0)))
      expect(Math.max(...steps)).toBeLessThan(0.15)
    }
  })

  it('starts a CSS blink where the clock already is', () => {
    expect(blinkDelayMs(0)).toBe(-0)
    expect(blinkDelayMs(BLINK_MS + 300)).toBe(-300)
    // a ring mounted now, read 200 ms later, is at the same point as the map
    const mountedAt = 5 * BLINK_MS + 300
    const elapsed = 200 - blinkDelayMs(mountedAt)
    expect(elapsed % BLINK_MS).toBe((mountedAt + 200) % BLINK_MS)
  })
})
