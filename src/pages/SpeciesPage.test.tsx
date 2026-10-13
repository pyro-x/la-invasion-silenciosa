import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'

describe('species screen (Pokédex)', () => {
  it('renders the 5 species with number, rarity progress and global total', async () => {
    renderRoute('/especies')
    expect(await screen.findByText('CANDADÍN')).toBeInTheDocument()
    for (const name of ['TURISTOX', 'CHECKINCHU', 'KEYMON', 'LOCALÍN']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getByText('Guía de campo de la turistificación')).toBeInTheDocument()
    expect(screen.getByText('18/45')).toBeInTheDocument()
    expect(screen.getByText('#001')).toBeInTheDocument()
    expect(screen.getByText('#005')).toBeInTheDocument()
    expect(
      screen.getByText('Antiguo comercio de barrio convertido en alojamiento turístico.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ahora hay maletas/)).not.toBeInTheDocument()
    expect(screen.getByText('7/12')).toBeInTheDocument()
    expect(
      screen.getByText('Candado o caja de llaves instalada en la vía pública.'),
    ).toBeInTheDocument()
  })

  it('opens the detail card when tapping a species', async () => {
    const user = userEvent.setup()
    renderRoute('/especies')
    await user.click(await screen.findByRole('button', { name: /CANDADÍN/ }))
    expect(await screen.findByText('¿Qué es?')).toBeInTheDocument()
    expect(screen.getByText('Hábitat')).toBeInTheDocument()
    expect(screen.getByText('Pista de rastreo')).toBeInTheDocument()
    expect(screen.getByText('Rejas, farolas, vallas y portales del barrio.')).toBeInTheDocument()
    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('común')).toBeInTheDocument()
  })

  it('deep-links a species detail and goes back to the list', async () => {
    const user = userEvent.setup()
    renderRoute('/especies/keymon')
    expect(await screen.findByText('KEYMON')).toBeInTheDocument()
    expect(screen.getByText('1/6')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '← Las especies' }))
    expect(await screen.findByText('Guía de campo de la turistificación')).toBeInTheDocument()
  })

  it('tells a Localín apart by its two criteria, not by its looks', async () => {
    renderRoute('/especies/localin')
    expect(await screen.findByText('LOCALÍN')).toBeInTheDocument()
    expect(screen.getByText('frecuente')).toBeInTheDocument()
    expect(screen.getByText('3/9')).toBeInTheDocument()
    expect(screen.getByText(/ahora hay maletas/)).toBeInTheDocument()
    expect(
      screen.getByText('Bajos comerciales que antes albergaban negocios del barrio.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Tienen que cumplirse dos cosas: que antes fuera un comercio del barrio y que hoy aloje visitantes. Estar en un bajo, tener la persiana echada o un candado no basta.',
      ),
    ).toBeInTheDocument()
  })

  it('redirects an unknown species id back to the list', async () => {
    renderRoute('/especies/gentrificator')
    expect(await screen.findByText('Guía de campo de la turistificación')).toBeInTheDocument()
  })
})
