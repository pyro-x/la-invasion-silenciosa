import { screen } from '@testing-library/react'
import { renderRoute } from '@/test/render'
import { APP_VERSION } from '@/lib/version'

describe('profile screen', () => {
  it('shows the build identity in the muted footer (LCHP-24)', async () => {
    renderRoute('/perfil')
    expect(await screen.findByText('¿Cómo se suman puntos?')).toBeInTheDocument()
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument()
  })

  it('keeps «Guarda tu cuenta» hidden while registration is switched off (D-060)', async () => {
    renderRoute('/perfil')
    await screen.findByText('¿Cómo se suman puntos?')
    expect(screen.queryByText('Guarda tu cuenta')).not.toBeInTheDocument()
  })
})
