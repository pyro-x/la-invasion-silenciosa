import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'

describe('credits page', () => {
  it('is reachable from the profile footer', async () => {
    renderRoute('/perfil')
    await userEvent.click(await screen.findByRole('link', { name: 'Créditos y licencias' }))
    expect(await screen.findByRole('heading', { name: 'Créditos y licencias' })).toBeInTheDocument()
  })

  it('credits the map data providers with their licence links', async () => {
    renderRoute('/creditos')
    expect(
      await screen.findByRole('link', { name: 'colaboradores de OpenStreetMap' }),
    ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    expect(screen.getByRole('link', { name: '© OpenMapTiles' })).toHaveAttribute(
      'href',
      'https://openmaptiles.org/',
    )
    expect(screen.getByText(/Open Database License/)).toBeInTheDocument()
  })

  it('carries the basemap design credit and the full upstream licence', async () => {
    renderRoute('/creditos')
    expect(await screen.findByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    )
    expect(screen.getByText(/Stamen y Paul Norman/)).toBeInTheDocument()
    const licence = screen.getByText(/Redistributions of source code must retain/)
    expect(licence).toHaveTextContent('Copyright (c) 2015, CartoDB Inc.')
    expect(licence).toHaveTextContent('THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS')
  })
})
