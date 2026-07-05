import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'

describe('static verification modal (mockup parity)', () => {
  it('opens from a «Cerca de ti» row and shows the golden-rule reminder', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await waitFor(() => expect(screen.getAllByText('Verificar').length).toBeGreaterThan(0))
    await user.click(screen.getAllByText('Verificar')[0])
    expect(screen.getByText('Verificar avistamiento')).toBeInTheDocument()
    expect(
      screen.getByText('Comprueba que no aparezcan personas ni datos privados.'),
    ).toBeInTheDocument()
  })

  it('Confirmar closes the modal and shows the +5 toast without changing state', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await waitFor(() => expect(screen.getAllByText('Verificar').length).toBeGreaterThan(0))
    await user.click(screen.getAllByText('Verificar')[0])
    await user.click(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(screen.queryByText('Verificar avistamiento')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('+5 · verificación')
    expect(screen.getByText('3 Por verificar')).toBeInTheDocument()
  })

  it('Saltar closes without a toast', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await waitFor(() => expect(screen.getAllByText('Verificar').length).toBeGreaterThan(0))
    await user.click(screen.getAllByText('Verificar')[0])
    await user.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(screen.queryByText('Verificar avistamiento')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
