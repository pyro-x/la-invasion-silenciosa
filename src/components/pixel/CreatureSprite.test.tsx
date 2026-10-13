import { render } from '@testing-library/react'
import { isSpeciesId, SPECIES_IDS, type SpeciesId } from '@/types/species'
import { CreatureSprite } from './CreatureSprite'
import { SPRITES } from './sprites'

describe('creature artwork and the ids it is asked for', () => {
  it('has a sprite for every species id the app knows', () => {
    expect(Object.keys(SPRITES).sort()).toEqual([...SPECIES_IDS].sort())
  })

  it('tells a known species id from a slug it has never heard of', () => {
    expect(isSpeciesId('keymon')).toBe(true)
    expect(isSpeciesId('gentrificator')).toBe(false)
    expect(isSpeciesId('')).toBe(false)
  })

  // LCHP-50: this render threw «Cannot read properties of undefined
  // (reading 'forEach')» and React Router replaced the whole screen.
  it('draws a stand-in, the size of a creature, for an id without artwork', () => {
    const slugFromNewerDatabase: string = 'gentrificator'
    const { container } = render(
      <CreatureSprite id={slugFromNewerDatabase as SpeciesId} scale={2.8} />,
    )
    const svg = container.querySelector('svg')
    const known = render(<CreatureSprite id="candadin" scale={2.8} />).container.querySelector(
      'svg',
    )
    expect(svg).toHaveAttribute('viewBox', known?.getAttribute('viewBox') ?? '')
    expect(svg).toHaveAttribute('width', known?.getAttribute('width') ?? '')
    expect(svg).toHaveAttribute('height', known?.getAttribute('height') ?? '')
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0)
  })
})
