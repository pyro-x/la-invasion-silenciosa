import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute as renderAt } from '@/test/render'

describe('shell navigation', () => {
  it('renders the 5 destinations of the bottom bar', () => {
    renderAt('/mapa')
    for (const label of ['Mapa', 'Especies', 'Ranking', 'Perfil']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Cazar' })).toBeInTheDocument()
  })

  it('navigates between tabs and marks the active one', async () => {
    const user = userEvent.setup()
    renderAt('/mapa')
    await user.click(screen.getByRole('link', { name: /ranking/i }))
    expect(screen.getByText('Ranking semanal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ranking/i })).toHaveClass('active')
  })

  it('the central button opens the hunt flow', async () => {
    const user = userEvent.setup()
    renderAt('/mapa')
    await user.click(screen.getByRole('button', { name: 'Cazar' }))
    expect(screen.getByText('Nuevo avistamiento')).toBeInTheDocument()
  })

  it('the home screen offers «Empezar la misión»', () => {
    renderAt('/')
    expect(screen.getByRole('button', { name: /empezar la misión/i })).toBeInTheDocument()
  })
})
