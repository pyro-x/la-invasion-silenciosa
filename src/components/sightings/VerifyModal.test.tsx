import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerifyModal } from './VerifyModal'
import type { MapSighting } from '@/types/sighting'

// The modal is rendered in isolation: MapPage no longer opens it (verify is
// «próximamente» until LCHP-15, which will wire it to the real transaction
// and to the real data shape). Here we test the component's own contract.
const SIGHTING: MapSighting = {
  id: 'A-220',
  speciesId: 'candadin',
  x: 570,
  y: 274,
  street: 'Plaza de los Carros',
  reportedBy: 'rosa_lat',
  reportedAgo: 'hace 20 m',
  status: 'pending',
  verificationCount: 1,
}

describe('verification modal (component)', () => {
  it('shows the creature, the golden-rule reminder and the actions', () => {
    render(
      <VerifyModal
        sighting={SIGHTING}
        speciesName="CANDADÍN"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('Verificar avistamiento')).toBeInTheDocument()
    expect(
      screen.getByText('Comprueba que no aparezcan personas ni datos privados.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saltar' })).toBeInTheDocument()
  })

  it('Confirmar fires onConfirm; Saltar/Cerrar fire onClose', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <VerifyModal
        sighting={SIGHTING}
        speciesName="CANDADÍN"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
