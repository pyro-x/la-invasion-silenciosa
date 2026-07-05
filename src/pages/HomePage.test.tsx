import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('home → onboarding → map flow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('first visit: start leads to the onboarding, accepting lands on the map', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('button', { name: /empezar la misión/i }))
    expect(router.state.location.pathname).toBe('/onboarding')
    expect(screen.getByText('Regla de oro')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /aceptar la misión/i }))
    expect(router.state.location.pathname).toBe('/mapa')
    expect(localStorage.getItem('sil_onb_v1')).toBe('1')
  })

  it('later visits: start goes straight to the map', async () => {
    localStorage.setItem('sil_onb_v1', '1')
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('button', { name: /empezar la misión/i }))
    expect(router.state.location.pathname).toBe('/mapa')
  })

  it('?onboarding=1 forces the onboarding even after being seen', async () => {
    localStorage.setItem('sil_onb_v1', '1')
    const user = userEvent.setup()
    const router = renderAt('/?onboarding=1')
    await user.click(screen.getByRole('button', { name: /empezar la misión/i }))
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('the golden rule shows the three prohibitions', () => {
    renderAt('/onboarding')
    const rule = screen.getByText(/Documenta criaturas, nunca personas/)
    expect(rule.textContent).toContain('huéspedes, porteros, vecinos o trabajadores')
    expect(rule.textContent).toContain('información privada')
    expect(rule.textContent).toContain('matrículas')
  })
})
