import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'

describe('map screen', () => {
  it('renders the toggle, the legend and the pending list', async () => {
    renderRoute('/mapa')
    expect(await screen.findByText('Avistamientos en La Latina')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avistamientos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mapa de calor' })).toBeInTheDocument()
    expect(screen.getByText('Cerca de ti')).toBeInTheDocument()
    expect(await screen.findByText('3 Por verificar')).toBeInTheDocument()
    expect(screen.getByText('Plaza de los Carros · @rosa_lat')).toBeInTheDocument()
  })

  it('blinks pending pins with the warn border, validated ones do not', async () => {
    renderRoute('/mapa')
    const pendingPin = await screen.findByRole('button', { name: 'Avistamiento A-220' })
    const pendingBox = pendingPin.firstElementChild as HTMLElement
    expect(pendingBox.style.animation).toContain('blinkdot')
    expect(pendingBox.getAttribute('style')).toContain('var(--warn)')
    const validatedPin = screen.getByRole('button', { name: 'Avistamiento A-204' })
    const validatedBox = validatedPin.firstElementChild as HTMLElement
    expect(validatedBox.style.animation).toBe('none')
    expect(validatedBox.getAttribute('style')).toContain('var(--line)')
  })

  it('opens the pin popover with species, street, age, status and verify CTA', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'Avistamiento A-220' }))
    expect(await screen.findByText('Plaza de los Carros · hace 20 m')).toBeInTheDocument()
    expect(screen.getByText('Por verificar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✔ Verificar' })).toBeInTheDocument()
  })

  it('shows the Validado chip and no verify CTA for validated sightings', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'Avistamiento A-204' }))
    expect(await screen.findByText('Cava Baja, 12 · hace 2 h')).toBeInTheDocument()
    expect(screen.getByText('Validado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '✔ Verificar' })).not.toBeInTheDocument()
  })

  it('switches to the heat map and hides the pins', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    expect(await screen.findByRole('button', { name: 'Avistamiento A-220' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mapa de calor' }))
    expect(screen.queryByRole('button', { name: 'Avistamiento A-220' })).not.toBeInTheDocument()
  })
})
