import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import { listPendingSightings } from '@/services/sightings.service'

function renderHunt() {
  const router = createMemoryRouter(routes, { initialEntries: ['/cazar'] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

describe('capture flow (Cazar)', () => {
  it('walks the 4 steps and confirms with the exact brief §4 wording', async () => {
    const user = userEvent.setup()
    renderHunt()

    // step 1: photo placeholder viewer + privacy reminder
    expect(screen.getByText('Captura la criatura')).toBeInTheDocument()
    expect(
      screen.getAllByText('Nada de personas, matrículas ni datos privados.').length,
    ).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Disparar foto/ }))
    await user.click(screen.getByRole('button', { name: /Usar foto/ }))

    // step 2: species picker; the CTA is disabled until a species is chosen
    expect(screen.getByText('¿Qué has encontrado?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ubicación aproximada/ })).toBeDisabled()
    await user.click(await screen.findByRole('button', { name: 'CANDADÍN' }))
    await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))

    // step 3: approximate-location step with the privacy toggle
    expect(await screen.findByText('Calle de la Cava Baja · La Latina')).toBeInTheDocument()
    expect(
      screen.getByText('Por privacidad, guardamos solo una ubicación aproximada.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Revisa y envía/ }))

    // step 4: review and submit
    expect(screen.getByText('Por verificar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Enviar al registro/ }))

    // success screen: the EXACT product string (brief §4) — never a definitive +10
    expect(
      await screen.findByText(
        'Avistamiento enviado · +10 puntos pendientes de validación',
        {
          exact: true,
        },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al mapa' })).toBeInTheDocument()

    // the fake sighting is registered as pending in the service
    const pending = await listPendingSightings()
    expect(pending.some((s) => s.speciesId === 'candadin' && s.reportedBy === 'pyroxine')).toBe(
      true,
    )
  })

  it('keeps collected data when navigating back through the step indicator', async () => {
    const user = userEvent.setup()
    renderHunt()

    await user.click(screen.getByRole('button', { name: /Disparar foto/ }))
    await user.click(screen.getByRole('button', { name: /Usar foto/ }))
    await user.click(await screen.findByRole('button', { name: 'KEYMON' }))
    await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))
    expect(screen.getByText('Ubicación aproximada')).toBeInTheDocument()

    // back to the species step: the selection is still there
    await user.click(screen.getByRole('button', { name: 'Paso 2' }))
    expect(screen.getByText('Identifica la especie')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ubicación aproximada/ })).toBeEnabled()
  })
})
