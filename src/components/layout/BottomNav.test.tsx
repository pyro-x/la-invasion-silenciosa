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

describe('shell navigation', () => {
  it('renders the 5 destinations of the bottom bar', () => {
    renderAt('/mapa')
    for (const label of ['Mapa', 'Especies', 'Cazar', 'Ranking', 'Perfil']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('navigates between tabs and marks the active one', async () => {
    const user = userEvent.setup()
    renderAt('/mapa')
    await user.click(screen.getByRole('link', { name: /ranking/i }))
    expect(screen.getByText('Top 10 semanal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ranking/i })).toHaveClass('active')
  })

  it('the central button opens the hunt flow', async () => {
    const user = userEvent.setup()
    renderAt('/mapa')
    await user.click(screen.getByRole('button', { name: 'Cazar' }))
    expect(screen.getByText('Flujo de captura')).toBeInTheDocument()
  })

  it('the home screen offers «Empezar la misión»', () => {
    renderAt('/')
    expect(screen.getByRole('button', { name: /empezar la misión/i })).toBeInTheDocument()
  })
})
