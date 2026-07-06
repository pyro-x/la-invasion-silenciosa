import { useEffect, useRef } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import type { CameraPermission } from '@/lib/permissions'
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

// Controls whether the equipment gate shows: 'granted' (default) skips it,
// like an Android return visit; 'prompt' arms it, like a first visit.
const cameraStateMock = vi.fn<() => Promise<CameraPermission>>(() => Promise.resolve('granted'))
vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  return { ...actual, cameraPermissionState: () => cameraStateMock() }
})

// The MapLibre picker needs WebGL; the stub reports the initial-load center
// once (like the real map) and, when a GPS fly is requested, its landing.
vi.mock('@/components/map/LocationPickerMap', () => ({
  LocationPickerMap: ({
    flyTo,
    onCenterChanged,
  }: {
    flyTo: { lat: number; lng: number } | null
    onCenterChanged: (center: { lat: number; lng: number }, byUser: boolean) => void
  }) => {
    const sent = useRef(false)
    const flown = useRef(false)
    useEffect(() => {
      if (!sent.current) {
        sent.current = true
        onCenterChanged({ lat: 40.4118, lng: -3.7105 }, false)
      }
      if (flyTo && !flown.current) {
        flown.current = true
        onCenterChanged(flyTo, false)
      }
    })
    return <div data-testid="picker-map" />
  },
}))

const submitMock = vi.fn<(s: NewSightingSubmission) => Promise<SubmitSightingResult>>()
vi.mock('@/services/sightings.service', () => ({
  submitSighting: (submission: NewSightingSubmission) => submitMock(submission),
  // MapPage mounts when a test navigates away from /cazar via ✕
  listMapSightings: () => Promise.resolve([]),
  listPendingSightings: () => Promise.resolve([]),
}))

beforeEach(() => {
  submitMock.mockReset()
  processPhotoMock.mockClear()
  cameraStateMock.mockClear()
  cameraStateMock.mockResolvedValue('granted')
  localStorage.clear()
})

// stubs must not leak into the next test even when an assertion throws
afterEach(() => {
  vi.unstubAllGlobals()
})

async function walkToReview(user: ReturnType<typeof userEvent.setup>) {
  // step 1: pick a photo through the gallery input → pipeline → preview
  // (findBy: the gate check resolves async before the step renders)
  const galleryInput = await screen.findByLabelText(/Galería/)
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
      (await screen.findAllByText('Nada de personas, matrículas ni datos privados.')).length,
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

    const galleryInput = await screen.findByLabelText(/Galería/)
    fireEvent.change(galleryInput, {
      target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
    })
    await user.click(await screen.findByRole('button', { name: /Usar foto/ }))
    await user.click(await screen.findByRole('button', { name: 'CANDADÍN' }))
    await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))

    await user.click(await screen.findByRole('button', { name: /Usar mi ubicación/ }))
    // per-platform guidance (non-iOS test env → the padlock path)
    expect(await screen.findByText(/candado de la barra/)).toBeInTheDocument()
    // the manual pin still works: the stubbed map center enables continuing
    expect(await screen.findByText('Pin colocado a mano')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled()
  })

  it('shows the equipment gate when camera permission is not granted; «Ahora no» skips it', async () => {
    const user = userEvent.setup()
    cameraStateMock.mockResolvedValue('prompt')
    renderHunt()

    expect(await screen.findByText('¡Prepara tu equipo!')).toBeInTheDocument()
    // the gate replaces the step content — no viewfinder button yet
    expect(screen.queryByRole('button', { name: /Abrir visor/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ahora no/ }))
    expect(await screen.findByRole('button', { name: /Abrir visor/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Galería/)).toBeInTheDocument()
  })

  it('the gate primes both permissions in one tap: viewfinder opens live, location step pre-centers', async () => {
    const user = userEvent.setup()
    cameraStateMock.mockResolvedValue('prompt')
    // a real happy-dom MediaStream (srcObject type-checks its value), plus
    // the getTracks its stub implementation lacks
    const fakeStream = Object.assign(new MediaStream(), { getTracks: () => [] })
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: () => Promise.resolve(fakeStream) },
      geolocation: {
        getCurrentPosition: (ok: (p: { coords: Record<string, number> }) => void) =>
          ok({ coords: { latitude: 40.4116, longitude: -3.7102, accuracy: 9 } }),
      },
    })
    renderHunt()

    await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))

    // the granted stream is handed straight to the viewfinder
    expect(await screen.findByRole('button', { name: /Disparar/ })).toBeInTheDocument()

    // continue on the gallery path (happy-dom video can't capture frames)
    await user.click(screen.getByRole('button', { name: /Cerrar visor/ }))
    fireEvent.change(screen.getByLabelText(/Galería/), {
      target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
    })
    await user.click(await screen.findByRole('button', { name: /Usar foto/ }))
    await user.click(await screen.findByRole('button', { name: 'CANDADÍN' }))
    await user.click(screen.getByRole('button', { name: /Ubicación aproximada/ }))

    // the cached gate fix pre-centers the map: GPS position without any tap
    expect(await screen.findByText(/Tu posición · ±9 m/)).toBeInTheDocument()
  })

  it('stops a granted stream if the user leaves before the arming settles (no camera-light leak)', async () => {
    const user = userEvent.setup()
    cameraStateMock.mockResolvedValue('prompt')
    const stopTrack = vi.fn()
    let resolveStream: (stream: MediaStream) => void = () => {}
    const fakeStream = Object.assign(new MediaStream(), {
      getTracks: () => [{ stop: stopTrack }],
    })
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: () => new Promise<MediaStream>((resolve) => (resolveStream = resolve)),
      },
      geolocation: { getCurrentPosition: () => {} }, // never answers (GPS cold)
    })
    renderHunt()

    await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))
    // the user gives up mid-wait and leaves the flow
    await user.click(screen.getByLabelText('Cerrar'))
    // ...and only then does the OS deliver the granted stream
    resolveStream(fakeStream)
    await waitFor(() => expect(stopTrack).toHaveBeenCalled())
  })

  it('keeps collected data when navigating back through the step indicator', async () => {
    const user = userEvent.setup()
    renderHunt()

    const galleryInput = await screen.findByLabelText(/Galería/)
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
