import { useEffect, useRef } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import { resetGeoWatchForTests } from '@/lib/geoWatch'
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

// The camera half of the door: 'granted' (default) is an Android return
// visit; 'prompt' a first visit, where the gate must ask.
const cameraStateMock = vi.fn<() => Promise<CameraPermission>>(() => Promise.resolve('granted'))
vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  return { ...actual, cameraPermissionState: () => cameraStateMock() }
})

// Where the neighbour's finger leaves the pin when a test drags the map.
const drag = vi.hoisted(() => ({ to: { lat: 40.4116, lng: -3.7102 } }))

// The MapLibre picker needs WebGL; the stub reports its opening centre once
// (the position it was given, or the barrio frame) and, when a fly is
// requested, its landing — like the real map. Its buttons stand in for the
// neighbour's gestures.
vi.mock('@/components/map/PickerMap', () => ({
  PICK_ZOOM: 17,
  PickerMap: ({
    initialCenter,
    flyTo,
    onCenterChanged,
  }: {
    initialCenter: { lat: number; lng: number } | null
    flyTo: { lat: number; lng: number } | null
    onCenterChanged: (center: { lat: number; lng: number }, byUser: boolean, zoom: number) => void
  }) => {
    const sent = useRef(false)
    const flown = useRef<{ lat: number; lng: number } | null>(null)
    const centre = useRef(initialCenter ?? { lat: 40.4118, lng: -3.7105 })
    useEffect(() => {
      if (!sent.current) {
        sent.current = true
        onCenterChanged(centre.current, false, 17)
      }
      // a new object is a new fly, as in the real map
      if (flyTo && flown.current !== flyTo) {
        flown.current = flyTo
        centre.current = flyTo
        onCenterChanged(flyTo, false, 17)
      }
    })
    return (
      <div data-testid="picker-map">
        <button
          aria-label="drag the map"
          onClick={() => {
            centre.current = drag.to
            onCenterChanged(drag.to, true, 17)
          }}
        />
        <button
          aria-label="pinch the map out"
          onClick={() => onCenterChanged(centre.current, true, 14)}
        />
      </div>
    )
  },
}))

const submitMock = vi.fn<(s: NewSightingSubmission) => Promise<SubmitSightingResult>>()
vi.mock('@/services/sightings.service', () => ({
  submitSighting: (submission: NewSightingSubmission) => submitMock(submission),
  // MapPage mounts when a test navigates away from /cazar via ✕
  listMapSightings: () => Promise.resolve([]),
}))

// The phone's geolocation, as the watch sees it.
type Success = (position: GeolocationPosition) => void
type Failure = (error: GeolocationPositionError) => void
const watchPositionMock = vi.fn<(success: Success, failure: Failure) => number>()
const clearWatchMock = vi.fn<(id: number) => void>()
const permissionsQueryMock = vi.fn<() => Promise<{ state: PermissionState }>>()

// The neighbour stands in the barrio, 40 m from where the map's barrio frame opens.
const HERE = { latitude: 40.4116, longitude: -3.7102 }
// About 60 m north of HERE: outside the capture radius.
const SIXTY_M_NORTH = { latitude: 40.4116 + 60 / 111_195, longitude: -3.7102 }
// About 90 m north of HERE: 68 m from a pin placed 22 m north.
const NINETY_M_NORTH = { latitude: 40.4116 + 90 / 111_195, longitude: -3.7102 }

function geoFix(
  { latitude, longitude }: { latitude: number; longitude: number },
  accuracy: number,
): GeolocationPosition {
  const coords = {
    latitude,
    longitude,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  }
  return { coords: { ...coords, toJSON: () => coords }, timestamp: Date.now(), toJSON: () => ({}) }
}

function geoFailure(code: number): GeolocationPositionError {
  return { code, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
}

/** Every watch is answered at once with this position. */
function phoneAt(at: { latitude: number; longitude: number } = HERE, accuracy = 9) {
  watchPositionMock.mockImplementation((success) => {
    success(geoFix(at, accuracy))
    return 1
  })
}

/** The phone holds its answer; `watcher()` hands the callbacks to the test. */
function phoneHolds() {
  watchPositionMock.mockImplementation(() => 1)
}

function watcher() {
  const [success, fail] = watchPositionMock.mock.calls.at(-1) ?? []
  if (!success || !fail) throw new Error('watchPosition was not called')
  return { success, fail }
}

/** The browser remembers the location grant: the watch resumes on arrival. */
function locationGranted() {
  localStorage.setItem('lis.geo.granted', '1')
  permissionsQueryMock.mockResolvedValue({ state: 'granted' })
}

/** A first visit: nothing remembered, the browser would ask. */
function firstVisit() {
  localStorage.removeItem('lis.geo.granted')
  permissionsQueryMock.mockResolvedValue({ state: 'prompt' })
}

function stubNavigator(extra: Record<string, unknown> = {}) {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      watchPosition: watchPositionMock,
      clearWatch: clearWatchMock,
      getCurrentPosition: () => {},
    },
    permissions: { query: permissionsQueryMock },
    ...extra,
  })
}

// a real happy-dom MediaStream (srcObject type-checks its value), plus the
// getTracks its stub implementation lacks
function fakeCamera(stopTrack = vi.fn()) {
  return Object.assign(new MediaStream(), { getTracks: () => [{ stop: stopTrack }] })
}

beforeEach(() => {
  resetGeoWatchForTests()
  submitMock.mockReset()
  processPhotoMock.mockClear()
  cameraStateMock.mockClear()
  cameraStateMock.mockResolvedValue('granted')
  watchPositionMock.mockReset()
  clearWatchMock.mockReset()
  permissionsQueryMock.mockReset()
  localStorage.clear()
  // the returning neighbour: both permissions remembered, no gate
  locationGranted()
  phoneAt()
  stubNavigator()
})

// stubs must not leak into the next test even when an assertion throws
afterEach(() => {
  vi.unstubAllGlobals()
})

async function walkToLocation(user: ReturnType<typeof userEvent.setup>) {
  const galleryInput = await screen.findByLabelText(/Galería/)
  fireEvent.change(galleryInput, {
    target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
  })
  await user.click(await screen.findByRole('button', { name: /Usar foto/ }))
  await user.click(await screen.findByRole('button', { name: 'CANDADÍN' }))
  await user.click(screen.getByRole('button', { name: /Sitúala en el mapa/ }))
}

async function walkToReview(user: ReturnType<typeof userEvent.setup>) {
  await walkToLocation(user)
  // step 3 opens on the position the watch already has: no tap. The way on
  // opens once the (lazy) picker has reported its opening centre, and the
  // review once the reticle's stamp has played.
  expect(await screen.findByText('Tu posición')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: /Revisa y envía/ }))
  await screen.findByRole('button', { name: /Enviar al registro/ })
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

    // the review card shows the approximate-location line of what the map shows
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
    expect(submission.lat).toBe(40.4116)
    expect(submission.lng).toBe(-3.7102)
    expect(submission.accuracyM).toBe(9)
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

  describe('a creature is registered where the neighbour stands (LCHP-49, LCHP-54)', () => {
    it('step 3 opens on the neighbour with no tap: position, precision, and the way on', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)

      expect(await screen.findByText('Tu posición')).toBeInTheDocument()
      expect(screen.getByText('± 9 m')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
      // the prompt no longer belongs to this step
      expect(screen.queryByRole('button', { name: /Usar mi ubicación/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Volver a mi posición/ })).toBeInTheDocument()
    })

    it('the pin can be nudged near the neighbour: sent as placed by hand, with no accuracy claim', async () => {
      const user = userEvent.setup()
      submitMock.mockResolvedValue({ kind: 'created', id: 'nudged' })
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      // about 22 m north of the position
      drag.to = { lat: 40.4118, lng: -3.7102 }
      await user.click(screen.getByRole('button', { name: 'drag the map' }))
      expect(await screen.findByText('Pin ajustado a mano · a 22 m de ti')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Revisa y envía/ }))
      await user.click(await screen.findByRole('button', { name: /Enviar al registro/ }))
      await waitFor(() => expect(submitMock).toHaveBeenCalled())
      expect(submitMock.mock.calls[0][0]).toMatchObject({
        lat: 40.4118,
        lng: -3.7102,
        accuracyM: null,
      })
    })

    it('a pin dragged further than the radius is refused, and going back to the position frees it', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      // about 111 m north of the position, still inside La Latina
      drag.to = { lat: 40.4126, lng: -3.7102 }
      await user.click(screen.getByRole('button', { name: 'drag the map' }))
      expect(
        await screen.findByText('Ese punto está a 112 m de ti. El máximo son 50 m.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: /Volver a mi posición/ }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
    })

    it('a neighbour just outside La Latina registers nothing, even with the pin inside it', async () => {
      const user = userEvent.setup()
      // 22 m beyond the barrio's northern margin
      phoneAt({ latitude: 40.416, longitude: -3.7102 })
      renderHunt()
      await walkToLocation(user)
      expect(await screen.findByText('Estás fuera de La Latina')).toBeInTheDocument()

      // 33 m south of the position: inside the barrio, and inside the radius
      drag.to = { lat: 40.4157, lng: -3.7102 }
      await user.click(screen.getByRole('button', { name: 'drag the map' }))
      expect(screen.getByText('Estás fuera de La Latina')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
    })

    it('the map follows the neighbour until they take it: each fix recentres the pin with its accuracy', async () => {
      const user = userEvent.setup()
      submitMock.mockResolvedValue({ kind: 'created', id: 'followed' })
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      // the neighbour walks 22 m north: the pin goes with them
      act(() => watcher().success(geoFix({ latitude: 40.4118, longitude: -3.7102 }, 7)))
      expect(await screen.findByText('± 7 m')).toBeInTheDocument()
      expect(screen.getByText('Tu posición')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
      await user.click(screen.getByRole('button', { name: /Revisa y envía/ }))
      await user.click(await screen.findByRole('button', { name: /Enviar al registro/ }))
      await waitFor(() => expect(submitMock).toHaveBeenCalled())
      expect(submitMock.mock.calls[0][0]).toMatchObject({
        lat: 40.4118,
        lng: -3.7102,
        accuracyM: 7,
      })
    })

    it('the map zoomed out past the street places no creature, and says so', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      await user.click(screen.getByRole('button', { name: 'pinch the map out' }))
      expect(await screen.findByText('Acerca el mapa hasta ver la calle')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
      expect(screen.getByTestId('reticle')).toHaveClass('is-far')
    })

    it('walking away from a pin placed by hand re-judges it; «Volver a mi posición» brings it back with its accuracy', async () => {
      const user = userEvent.setup()
      submitMock.mockResolvedValue({ kind: 'created', id: 'returned' })
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      // the pin is placed by hand 22 m north; the map is the neighbour's now
      drag.to = { lat: 40.4118, lng: -3.7102 }
      await user.click(screen.getByRole('button', { name: 'drag the map' }))
      await screen.findByText('Pin ajustado a mano · a 22 m de ti')
      expect(screen.getByTestId('reticle')).not.toHaveClass('is-far')

      // the phone reports the neighbour 90 m north of where they stood
      act(() => watcher().success(geoFix(NINETY_M_NORTH, 7)))
      expect(
        await screen.findByText(/Ese punto está a \d\d m de ti\. El máximo son 50 m\./),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
      expect(screen.getByTestId('reticle')).toHaveClass('is-far')

      await user.click(screen.getByRole('button', { name: /Volver a mi posición/ }))
      expect(await screen.findByText('Tu posición')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
      await user.click(screen.getByRole('button', { name: /Revisa y envía/ }))
      await user.click(await screen.findByRole('button', { name: /Enviar al registro/ }))
      await waitFor(() => expect(submitMock).toHaveBeenCalled())
      // the pin went back to the newest position, with that position's accuracy
      expect(submitMock.mock.calls[0][0]).toMatchObject({
        lat: NINETY_M_NORTH.latitude,
        lng: NINETY_M_NORTH.longitude,
        accuracyM: 7,
      })
    })

    it('a position that turns vague while on the step withdraws the way on', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      act(() => watcher().success(geoFix(HERE, 180)))
      expect(await screen.findByText('Tu ubicación es poco precisa (± 180 m)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
    })

    it('a position lost while on the step shows the way back, and «Reintentar» is the tap', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')

      // the phone revokes the permission (code=1, the iOS Safari case)
      act(() => watcher().fail(geoFailure(1)))
      // per-platform guidance (non-iOS test env → the padlock path), with no
      // promise of a pin placed by hand
      const guidance = await screen.findByText(/candado de la barra/)
      expect(guidance).not.toHaveTextContent('a mano')
      expect(screen.getByText('Activa tu ubicación para situar la criatura')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
      expect(screen.queryByRole('button', { name: /Volver a mi posición/ })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByText('Tu posición')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
    })

    it('leaving the step and coming back opens on the latest position', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')
      await user.click(screen.getByRole('button', { name: 'Paso 2' }))
      // meanwhile the neighbour walked 22 m north
      act(() => watcher().success(geoFix({ latitude: 40.4118, longitude: -3.7102 }, 7)))
      await user.click(screen.getByRole('button', { name: /Sitúala en el mapa/ }))
      expect(await screen.findByText('Tu posición')).toBeInTheDocument()
      expect(screen.getByText('± 7 m')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
    })

    it('a pin just over the radius is told a distance that is over it', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToLocation(user)
      await screen.findByText('Tu posición')
      // 50.3 m north of the position
      drag.to = { lat: HERE.latitude + 50.3 / 111_195, lng: HERE.longitude }
      await user.click(screen.getByRole('button', { name: 'drag the map' }))
      expect(
        await screen.findByText('Ese punto está a 51 m de ti. El máximo son 50 m.'),
      ).toBeInTheDocument()
    })

    it('a position too vague passes the door but places no creature, and says how to fix it', async () => {
      const user = userEvent.setup()
      phoneAt(HERE, 180)
      renderHunt()
      await walkToLocation(user)

      expect(await screen.findByText('Tu ubicación es poco precisa (± 180 m)')).toBeInTheDocument()
      expect(screen.getByText(/precisión alta/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
    })

    it('the rule holds at the review: a neighbour who walked away cannot send until back at the pin', async () => {
      const user = userEvent.setup()
      renderHunt()
      await walkToReview(user)
      expect(screen.getByRole('button', { name: /Enviar al registro/ })).toBeEnabled()

      act(() => watcher().success(geoFix(SIXTY_M_NORTH, 9)))
      expect(await screen.findByRole('status')).toHaveTextContent(
        /El pin está a 6\d m de ti\. Acércate a menos de 50 m, o vuelve a situarlo\./,
      )
      expect(screen.getByRole('button', { name: /Enviar al registro/ })).toBeDisabled()

      // back at the pin: the way on returns
      act(() => watcher().success(geoFix(HERE, 9)))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Enviar al registro/ })).toBeEnabled(),
      )

      // a position lost at the review blocks too, and «Volver a situarla» goes back to the map
      act(() => watcher().fail(geoFailure(1)))
      expect(await screen.findByRole('status')).toHaveTextContent(/Activa tu ubicación para enviar/)
      expect(screen.getByRole('button', { name: /Enviar al registro/ })).toBeDisabled()
      await user.click(screen.getByRole('button', { name: /Volver a situarla/ }))
      expect(await screen.findByText('¿Dónde está la criatura?')).toBeInTheDocument()
      expect(submitMock).not.toHaveBeenCalled()
    })
  })

  describe('the door (LCHP-28, LCHP-54)', () => {
    it('a returning neighbour with both permissions sees no gate: the watch resumes with no tap', async () => {
      renderHunt()
      expect(await screen.findByLabelText(/Galería/)).toBeInTheDocument()
      expect(screen.queryByText('¡Prepara tu equipo!')).not.toBeInTheDocument()
      expect(watchPositionMock).toHaveBeenCalledTimes(1)
    })

    it('a resumed watch still searching passes the door: step 3 waits for the fix, then centres', async () => {
      const user = userEvent.setup()
      phoneHolds()
      renderHunt()
      // the browser already granted: nothing to ask, the photo step opens
      expect(await screen.findByLabelText(/Galería/)).toBeInTheDocument()
      expect(screen.queryByText('¡Prepara tu equipo!')).not.toBeInTheDocument()

      await walkToLocation(user)
      expect(await screen.findByText('Buscando tu posición…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
      expect(screen.queryByRole('button', { name: /Volver a mi posición/ })).not.toBeInTheDocument()

      act(() => watcher().success(geoFix(HERE, 9)))
      expect(await screen.findByText('Tu posición')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeEnabled(),
      )
    })

    it('nothing is judged before the browser has answered whether the watch may resume', async () => {
      cameraStateMock.mockResolvedValue('prompt')
      let answer: (state: { state: PermissionState }) => void = () => {}
      permissionsQueryMock.mockReturnValue(new Promise((resolve) => (answer = resolve)))
      renderHunt()
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
      expect(screen.queryByText('¡Prepara tu equipo!')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Galería/)).not.toBeInTheDocument()

      act(() => answer({ state: 'prompt' }))
      expect(await screen.findByText('¡Prepara tu equipo!')).toBeInTheDocument()
    })

    it('a first visit asks nothing on load; the gate shows, and its tap starts the watch and the camera together, in the gesture', async () => {
      firstVisit()
      cameraStateMock.mockResolvedValue('prompt')
      const getUserMedia = vi.fn(() => Promise.resolve(fakeCamera()))
      stubNavigator({ mediaDevices: { getUserMedia } })
      renderHunt()

      expect(await screen.findByText('¡Prepara tu equipo!')).toBeInTheDocument()
      expect(screen.getByText(/solo se registra estando junto a ella/)).toBeInTheDocument()
      expect(watchPositionMock).not.toHaveBeenCalled()
      expect(getUserMedia).not.toHaveBeenCalled()
      // the gate replaces the step content, and there is no way around it
      expect(screen.queryByRole('button', { name: /Abrir visor/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Ahora no/ })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al mapa' })).toBeInTheDocument()

      // both requests leave within the tap itself (Safari's transient activation)
      fireEvent.click(screen.getByRole('button', { name: /Activar cámara y ubicación/ }))
      expect(watchPositionMock).toHaveBeenCalledTimes(1)
      expect(getUserMedia).toHaveBeenCalledTimes(1)
      // the granted stream is handed straight to the viewfinder
      expect(await screen.findByRole('button', { name: /Disparar/ })).toBeInTheDocument()
    })

    it('with the camera granted and no position, the gate asks for the position only', async () => {
      const user = userEvent.setup()
      firstVisit()
      const getUserMedia = vi.fn(() => Promise.resolve(fakeCamera()))
      stubNavigator({ mediaDevices: { getUserMedia } })
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar mi ubicación/ }))
      // the viewfinder opens on the granted permission: that is the photo
      // step's own request, the door made none
      expect(await screen.findByRole('button', { name: /Disparar/ })).toBeInTheDocument()
      expect(watchPositionMock).toHaveBeenCalledTimes(1)
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('the gate waits for the position the tap asked for: searching until the phone answers, then the flow opens', async () => {
      const user = userEvent.setup()
      firstVisit()
      phoneHolds()
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar mi ubicación/ }))
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Buscando tu posición… Si el navegador pregunta, pulsa «Permitir».',
      )
      expect(screen.getByRole('button', { name: /Buscando tu posición/ })).toBeDisabled()
      expect(screen.queryByLabelText(/Galería/)).not.toBeInTheDocument()

      act(() => watcher().success(geoFix(HERE, 9)))
      expect(await screen.findByLabelText(/Galería/)).toBeInTheDocument()
      expect(screen.queryByText('¡Prepara tu equipo!')).not.toBeInTheDocument()
    })

    it('a location denial is answered at the gate: guidance, retry, the way back, and no photo step', async () => {
      const user = userEvent.setup()
      firstVisit()
      phoneHolds()
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar mi ubicación/ }))
      act(() => watcher().fail(geoFailure(1)))
      expect(await screen.findByText(/candado de la barra/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al mapa' })).toBeInTheDocument()
      expect(screen.queryByLabelText(/Galería/)).not.toBeInTheDocument()

      // the neighbour allows it in the browser and tries again
      phoneAt()
      await user.click(screen.getByRole('button', { name: /Reintentar/ }))
      expect(await screen.findByLabelText(/Galería/)).toBeInTheDocument()
    })

    it('a camera granted while the position is refused is released, and comes back by itself after', async () => {
      const user = userEvent.setup()
      firstVisit()
      cameraStateMock.mockResolvedValue('prompt')
      phoneHolds()
      const stopTrack = vi.fn()
      const getUserMedia = vi.fn(() => Promise.resolve(fakeCamera(stopTrack)))
      stubNavigator({ mediaDevices: { getUserMedia } })
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))
      await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
      act(() => watcher().fail(geoFailure(1)))
      // no camera light behind the Settings guidance
      await waitFor(() => expect(stopTrack).toHaveBeenCalled())
      expect(screen.getByText(/candado de la barra/)).toBeInTheDocument()

      // allowed and retried: the viewfinder opens again on the granted permission
      phoneAt()
      await user.click(screen.getByRole('button', { name: /Reintentar/ }))
      expect(await screen.findByRole('button', { name: /Disparar/ })).toBeInTheDocument()
      expect(getUserMedia).toHaveBeenCalledTimes(2)
    })

    it('a camera granted after the position was already refused is released on arrival', async () => {
      const user = userEvent.setup()
      firstVisit()
      cameraStateMock.mockResolvedValue('prompt')
      phoneHolds()
      const stopTrack = vi.fn()
      let grant: (stream: MediaStream) => void = () => {}
      stubNavigator({
        mediaDevices: {
          getUserMedia: () => new Promise<MediaStream>((resolve) => (grant = resolve)),
        },
      })
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))
      // the position is refused first...
      act(() => watcher().fail(geoFailure(1)))
      await screen.findByText(/candado de la barra/)
      // ...and the camera answers afterwards, well before the limit
      act(() => grant(fakeCamera(stopTrack)))
      await waitFor(() => expect(stopTrack).toHaveBeenCalled())
      expect(screen.getByText(/candado de la barra/)).toBeInTheDocument()
    })

    it('a camera waiting for the first fix is released when the watch pauses in the background', async () => {
      const user = userEvent.setup()
      firstVisit()
      cameraStateMock.mockResolvedValue('prompt')
      phoneHolds()
      const stopTrack = vi.fn()
      const getUserMedia = vi.fn(() => Promise.resolve(fakeCamera(stopTrack)))
      stubNavigator({ mediaDevices: { getUserMedia } })
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))
      await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
      // back from the background, the browser will not say the grant still holds
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await waitFor(() => expect(stopTrack).toHaveBeenCalled())
      expect(screen.getByRole('button', { name: /Activar mi ubicación/ })).toBeEnabled()
      expect(screen.queryByLabelText(/Galería/)).not.toBeInTheDocument()
    })

    it('a camera the browser grants after the door gave up on it is stopped on arrival', async () => {
      vi.useFakeTimers()
      try {
        firstVisit()
        cameraStateMock.mockResolvedValue('prompt')
        const stopTrack = vi.fn()
        const requests: Array<(stream: MediaStream) => void> = []
        stubNavigator({
          mediaDevices: {
            getUserMedia: () => new Promise<MediaStream>((resolve) => requests.push(resolve)),
          },
        })
        renderHunt()
        await act(() => vi.advanceTimersByTimeAsync(0))
        fireEvent.click(screen.getByRole('button', { name: /Activar cámara y ubicación/ }))
        expect(requests).toHaveLength(1)

        // 15 s without an answer: the door stops waiting for the camera
        await act(() => vi.advanceTimersByTimeAsync(15_000))
        expect(screen.queryByText('¡Prepara tu equipo!')).not.toBeInTheDocument()
        expect(screen.getByLabelText(/Galería/)).toBeInTheDocument()

        // ...and the browser grants it afterwards: nobody wants it any more
        act(() => requests[0](fakeCamera(stopTrack)))
        await act(() => vi.advanceTimersByTimeAsync(0))
        expect(stopTrack).toHaveBeenCalled()
      } finally {
        vi.useRealTimers()
      }
    })

    it('a camera denial is not a wall: the photo step opens with the system camera and the gallery', async () => {
      const user = userEvent.setup()
      firstVisit()
      cameraStateMock.mockResolvedValue('prompt')
      stubNavigator({
        mediaDevices: { getUserMedia: () => Promise.reject(new Error('NotAllowedError')) },
      })
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))
      expect(await screen.findByLabelText(/Galería/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Cámara del sistema/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Disparar/ })).not.toBeInTheDocument()
    })

    it('a position lost after the door does not close it again: the notice waits at step 3', async () => {
      renderHunt()
      await screen.findByLabelText(/Galería/)
      act(() => watcher().fail(geoFailure(1)))
      expect(screen.getByLabelText(/Galería/)).toBeInTheDocument()
      expect(screen.queryByText('¡Prepara tu equipo!')).not.toBeInTheDocument()
    })

    it('leaving the flow stops the watch', async () => {
      const user = userEvent.setup()
      renderHunt()
      await screen.findByLabelText(/Galería/)
      // the map the neighbour goes back to must not be the one stopping it
      permissionsQueryMock.mockResolvedValue({ state: 'prompt' })
      await user.click(screen.getByLabelText('Cerrar'))
      await waitFor(() => expect(clearWatchMock).toHaveBeenCalledWith(1))
      expect(watchPositionMock).toHaveBeenCalledTimes(1)
    })

    it('stops a granted stream if the user leaves before the arming settles (no camera-light leak)', async () => {
      const user = userEvent.setup()
      firstVisit()
      cameraStateMock.mockResolvedValue('prompt')
      phoneHolds()
      const stopTrack = vi.fn()
      let resolveStream: (stream: MediaStream) => void = () => {}
      stubNavigator({
        mediaDevices: {
          getUserMedia: () => new Promise<MediaStream>((resolve) => (resolveStream = resolve)),
        },
      })
      renderHunt()

      await user.click(await screen.findByRole('button', { name: /Activar cámara y ubicación/ }))
      // the user gives up mid-wait and leaves the flow
      await user.click(screen.getByLabelText('Cerrar'))
      // ...and only then does the OS deliver the granted stream
      resolveStream(fakeCamera(stopTrack))
      await waitFor(() => expect(stopTrack).toHaveBeenCalled())
    })
  })

  it('keeps collected data when navigating back through the step indicator', async () => {
    const user = userEvent.setup()
    renderHunt()

    const galleryInput = await screen.findByLabelText(/Galería/)
    fireEvent.change(galleryInput, {
      target: { files: [new File(['raw'], 'foto.jpg', { type: 'image/jpeg' })] },
    })
    await user.click(await screen.findByRole('button', { name: /Usar foto/ }))
    for (const name of ['CANDADÍN', 'TURISTOX', 'CHECKINCHU', 'LOCALÍN']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    await user.click(await screen.findByRole('button', { name: 'KEYMON' }))
    await user.click(screen.getByRole('button', { name: /Sitúala en el mapa/ }))
    expect(screen.getByText('¿Dónde está la criatura?')).toBeInTheDocument()
    expect(
      screen.getByText('Por privacidad, en el mapa solo se muestra una ubicación aproximada.'),
    ).toBeInTheDocument()

    // back to the species step: the selection is still there
    await user.click(screen.getByRole('button', { name: 'Paso 2' }))
    expect(screen.getByText('Identifica la especie')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sitúala en el mapa/ })).toBeEnabled()

    // and back to the photo step: the preview is still there
    await user.click(screen.getByRole('button', { name: 'Paso 1' }))
    expect(screen.getByAltText('Foto del avistamiento')).toBeInTheDocument()
  })
})
