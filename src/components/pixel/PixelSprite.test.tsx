import { render } from '@testing-library/react'
import { CreatureSprite } from './CreatureSprite'
import { MiniPix } from './PixelSprite'
import { NAV_ICONS, SPRITES } from './sprites'

describe('pixel artwork', () => {
  it('draws a creature as an SVG of its grid, at the size asked for', () => {
    const { container } = render(<CreatureSprite id="candadin" scale={2.8} />)
    const svg = container.querySelector('svg')
    const columns = SPRITES.candadin[0].length
    const rows = SPRITES.candadin.length
    expect(svg).toHaveAttribute('viewBox', `0 0 ${columns} ${rows}`)
    expect(svg).toHaveAttribute('width', String(columns * 2.8))
    expect(svg).toHaveAttribute('height', String(rows * 2.8))
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges')
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(10)
    expect(svg?.querySelector('rect')).toHaveAttribute('fill', '#241a2e')
  })

  it('draws a tab icon in the colour of the text around it', () => {
    const { container } = render(<MiniPix grid={NAV_ICONS.map} scale={4} />)
    const fills = [...container.querySelectorAll('rect')].map((r) => r.getAttribute('fill'))
    expect(new Set(fills)).toEqual(new Set(['currentColor']))
  })

  it('paints nothing with box-shadow any more', () => {
    const { container } = render(<CreatureSprite id="keymon" />)
    expect(container.innerHTML).not.toContain('box-shadow')
  })
})
