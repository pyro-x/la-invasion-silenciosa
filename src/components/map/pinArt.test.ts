import { blinkDelayMs, BLINK_MS } from './blink'
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
  it('starts a CSS blink where the clock already is', () => {
    expect(blinkDelayMs(0)).toBe(-0)
    expect(blinkDelayMs(BLINK_MS + 300)).toBe(-300)
    // a ring mounted now, read 200 ms later, is at the same point as the map
    const mountedAt = 5 * BLINK_MS + 300
    const elapsed = 200 - blinkDelayMs(mountedAt)
    expect(elapsed % BLINK_MS).toBe((mountedAt + 200) % BLINK_MS)
  })
})
