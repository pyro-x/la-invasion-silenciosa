import { useEffect, useRef } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import type { NewSightingSubmission, SubmitSightingResult } from '@/services/sightings.service'

// Fresh, retry:false query client per test (renderRoute) — avoids the shared
// singleton leaking cache across tests and keeps the suite deterministic.
const renderHunt = () => renderRoute('/cazar')

// The photo pipeline needs canvas/createImageBitmap (absent in happy-dom);
// the flow only cares that a clean Blob comes out of it.
const processPhotoMock = vi.fn(() =>
  Promise.resolve(new Blob(['clean-jpeg'], { type: 'image/jpeg' })),
)
vi.mock('@/lib/photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/photo')>()
  return { ...actual, processPhoto: () => processPhotoMock() }
})

// The MapLibre picker needs WebGL; the stub reports a valid La Latina center
// once, exactly like the real map does after its initial load.
vi.mock('@/components/map/LocationPickerMap', () => ({
  LocationPickerMap: ({
    onCenterChanged,
  }: {
    onCenterChanged: (center: { lat: number; lng: number }, byUser: boolean) => void
  }) => {
    const sent = useRef(false)
    useEffect(() => {
      if (!sent.current) {
        sent.current = true
        onCenterChanged({ lat: 40.4118, lng: -3.7105 }, false)
      }
    })
    return <div data-testid="picker-map" />
  },
}))

const submitMock = vi.fn<(s: NewSightingSubmission) => Promise<SubmitSightingResult>>()
vi.mock('@/services/sightings.service', () => ({
  submitSighting: (submission: NewSightingSubmission) => submitMock(submission),
}))

beforeEach(() => {
  submitMock.mockReset()
  processPhotoMock.mockClear()
})

async function walkToReview(user: ReturnType<typeof userEvent.setup>) {
  // step 1: pick a photo through the gallery input → pipeline → preview
  const galleryInput = screen.getByLabelText(/Galería/)
  fireEvent.change(galleryInput, {
    target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
  })
  await user.click(await screen.findByRole('button', { name: /Usar foto/ }))

  // step 2: species picker
  await user.click(await screen.findByRole('button', { name: 'CANDADÍN' }))
  await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))

  // step 3: the (stubbed, lazy-loaded) picker map reports a valid center
  expect(await screen.findByText('Pin colocado a mano')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Revisa y envía/ }))
}

describe('capture flow (Cazar)', () => {
  it('walks the 4 steps against the real submit and confirms with the exact brief §4 wording', async () => {
    const user = userEvent.setup()
    submitMock.mockResolvedValue({ kind: 'created', id: 'new-sighting' })
    renderHunt()

    expect(screen.getByText('Captura la criatura')).toBeInTheDocument()
    expect(
      screen.getAllByText('Nada de personas, matrículas ni datos privados.').length,
    ).toBeGreaterThan(0)

    await walkToReview(user)

    // privacy toggle text lives on the location step we just passed through;
    // the review card shows the approximate-location line instead
    expect(screen.getByText('La Latina · Ubicación aproximada')).toBeInTheDocument()
    expect(screen.getByText('Por verificar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Enviar al registro/ }))

    // success screen: the EXACT product string (brief §4) — never a definitive +10
    expect(
      await screen.findByText('Avistamiento enviado · +10 puntos pendientes de validación', {
        exact: true,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al mapa' })).toBeInTheDocument()

    // the payload carried the processed photo and the picker's exact center
    expect(processPhotoMock).toHaveBeenCalledTimes(1)
    const submission = submitMock.mock.calls[0][0]
    expect(submission.speciesId).toBe('candadin')
    expect(submission.lat).toBe(40.4118)
    expect(submission.lng).toBe(-3.7105)
    expect(submission.accuracyM).toBeNull()
    expect(submission.photo).toBeInstanceOf(Blob)
  })

  it('shows the quota message on 429 and retries without losing the form', async () => {
    const user = userEvent.setup()
    submitMock.mockResolvedValueOnce({ kind: 'rejected', message: 'Has llegado al límite de hoy' })
    renderHunt()

    await walkToReview(user)
    await user.click(screen.getByRole('button', { name: /Enviar al registro/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Has llegado al límite de hoy')

    // retry with the same collected data → success (nothing was lost)
    submitMock.mockResolvedValueOnce({ kind: 'created', id: 'retried' })
    await user.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(
      await screen.findByText('Avistamiento enviado · +10 puntos pendientes de validación'),
    ).toBeInTheDocument()
    expect(submitMock).toHaveBeenCalledTimes(2)
    expect(submitMock.mock.calls[1][0].speciesId).toBe('candadin')
  })

  it('shows a connection message on a network failure', async () => {
    const user = userEvent.setup()
    submitMock.mockResolvedValue({ kind: 'error' })
    renderHunt()

    await walkToReview(user)
    await user.click(screen.getByRole('button', { name: /Enviar al registro/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.',
    )
  })

  it('degrades to the manual pin when geolocation is denied (code=1, iOS Safari case)', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, onError: (error: { code: number }) => void) =>
          onError({ code: 1 }),
      },
    })
    renderHunt()

    const galleryInput = screen.getByLabelText(/Galería/)
    fireEvent.change(galleryInput, {
      target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
    })
    await user.click(await screen.findByRole('button', { name: /Usar foto/ }))
    await user.click(await screen.findByRole('button', { name: 'CANDADÍN' }))
    await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))

    await user.click(await screen.findByRole('button', { name: /Usar mi ubicación/ }))
    expect(await screen.findByText(/Actívala en Ajustes → Safari/)).toBeInTheDocument()
    // the manual pin still works: the stubbed map center enables continuing
    expect(await screen.findByText('Pin colocado a mano')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled()

    vi.unstubAllGlobals()
  })

  it('keeps collected data when navigating back through the step indicator', async () => {
    const user = userEvent.setup()
    renderHunt()

    const galleryInput = screen.getByLabelText(/Galería/)
    fireEvent.change(galleryInput, {
      target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
    })
    await user.click(await screen.findByRole('button', { name: /Usar foto/ }))
    await user.click(await screen.findByRole('button', { name: 'KEYMON' }))
    await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))
    expect(
      screen.getByText('Por privacidad, guardamos solo una ubicación aproximada.'),
    ).toBeInTheDocument()

    // back to the species step: the selection is still there
    await user.click(screen.getByRole('button', { name: 'Paso 2' }))
    expect(screen.getByText('Identifica la especie')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ubicación aproximada/ })).toBeEnabled()

    // and back to the photo step: the preview is still there
    await user.click(screen.getByRole('button', { name: 'Paso 1' }))
    expect(screen.getByAltText('Foto del avistamiento')).toBeInTheDocument()
  })
})
