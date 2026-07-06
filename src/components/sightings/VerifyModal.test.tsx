import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerifyModal } from './VerifyModal'
import type { VerifyOutcome } from '@/services/verifications.service'
import type { MapSightingGeo } from '@/types/sighting'

const SIGHTING: MapSightingGeo = {
  id: 's-pending',
  speciesId: 'candadin',
  lat: 40.4118,
  lng: -3.7105,
  status: 'pending',
  verificationCount: 1,
  createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
}

const submitMock = vi.fn<(id: string) => Promise<VerifyOutcome>>()
const evidenceMock = vi.fn<(id: string) => Promise<Record<string, unknown>>>()

vi.mock('@/services/verifications.service', () => ({
  submitVerification: (id: string) => submitMock(id),
}))
vi.mock('@/services/evidence.service', () => ({
  getEvidenceUrl: (id: string) => evidenceMock(id),
}))

beforeEach(() => {
  submitMock.mockResolvedValue({ kind: 'validated' })
  evidenceMock.mockResolvedValue({
    kind: 'ready',
    url: 'https://storage.example/signed/photo.jpg',
    expiresIn: 300,
  })
})

function renderModal(overrides?: {
  onClose?: () => void
  onResult?: (o: VerifyOutcome) => void
  onReclassify?: () => void
}) {
  return render(
    <VerifyModal
      sighting={SIGHTING}
      speciesName="CANDADÍN"
      onClose={overrides?.onClose ?? (() => {})}
      onResult={overrides?.onResult ?? (() => {})}
      onReclassify={overrides?.onReclassify ?? (() => {})}
    />,
  )
}

describe('verification modal', () => {
  it('loads the photo evidence when it opens — the neighbor judges the photo', async () => {
    renderModal()
    const img = await screen.findByRole('img', { name: /Evidencia/ })
    expect(img).toHaveAttribute('src', 'https://storage.example/signed/photo.jpg')
    expect(evidenceMock).toHaveBeenCalledWith('s-pending')
  })

  it('shows species, approximate location, the golden-rule reminder — never author or street', async () => {
    renderModal()
    expect(screen.getByText('CANDADÍN')).toBeInTheDocument()
    expect(screen.getByText('Ubicación aproximada · La Latina · hace 20 min')).toBeInTheDocument()
    expect(
      screen.getByText('Comprueba que no aparezcan personas ni datos privados.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Reportado por/)).not.toBeInTheDocument()
  })

  it('Confirmar submits the verification and reports the outcome', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    renderModal({ onResult })
    await screen.findByRole('img', { name: /Evidencia/ })
    await user.click(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(submitMock).toHaveBeenCalledWith('s-pending')
    expect(onResult).toHaveBeenCalledWith({ kind: 'validated' })
  })

  it('the confirm button is disabled while the transaction is in flight', async () => {
    const user = userEvent.setup()
    let resolve: (o: VerifyOutcome) => void = () => {}
    submitMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    renderModal()
    await screen.findByRole('img', { name: /Evidencia/ })
    await user.click(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
    resolve({ kind: 'counted' })
  })

  it('confirming is impossible until the evidence has rendered (no blind vouching)', async () => {
    let resolve: (v: Record<string, unknown>) => void = () => {}
    evidenceMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    renderModal()
    // while loading: disabled
    expect(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ })).toBeDisabled()
    resolve({ kind: 'ready', url: 'https://storage.example/signed/photo.jpg', expiresIn: 300 })
    await screen.findByRole('img', { name: /Evidencia/ })
    expect(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ })).toBeEnabled()
  })

  it('a sighting without a photo shows the friendly message and cannot be confirmed', async () => {
    evidenceMock.mockResolvedValue({ kind: 'unavailable' })
    renderModal()
    expect(
      await screen.findByText('Este avistamiento aún no tiene foto disponible'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar \(\+5 pts\)/ })).toBeDisabled()
  })

  it('Saltar closes; Reclasificar defers (post-MVP)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onReclassify = vi.fn()
    renderModal({ onClose, onReclassify })
    await user.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(onClose).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Reclasificar' }))
    expect(onReclassify).toHaveBeenCalledOnce()
  })
})
