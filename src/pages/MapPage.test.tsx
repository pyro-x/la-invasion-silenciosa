import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/render'
import type { MapSightingGeo } from '@/types/sighting'

const FIXTURES: MapSightingGeo[] = [
  {
    id: 's-approved',
    speciesId: 'candadin',
    lat: 40.4118,
    lng: -3.7105,
    status: 'approved',
    verificationCount: 4,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 's-pending',
    speciesId: 'turistox',
    lat: 40.4109,
    lng: -3.7074,
    status: 'pending',
    verificationCount: 0,
    createdAt: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
]

// The real service hits Supabase; the map needs WebGL. Stub both so the test
// exercises MapPage's own logic (data → markers, detail sheet, nearby list).
// Both mocks are controllable per test (rejections, deferred responses).
const listMapSightingsMock = vi.fn<() => Promise<MapSightingGeo[]>>()
const getEvidenceUrlMock = vi.fn<(id: string) => Promise<Record<string, unknown>>>()

vi.mock('@/services/sightings.service', async (importActual) => ({
  ...(await importActual<typeof import('@/services/sightings.service')>()),
  listMapSightings: () => listMapSightingsMock(),
}))

vi.mock('@/services/evidence.service', () => ({
  getEvidenceUrl: (id: string) => getEvidenceUrlMock(id),
}))

const submitVerificationMock = vi.fn<(id: string) => Promise<{ kind: string }>>()

vi.mock('@/services/verifications.service', () => ({
  submitVerification: (id: string) => submitVerificationMock(id),
  countOwnProvisionalConfirmations: () => Promise.resolve(0),
}))

// The first-confirm invitation modal (LCHP-30) embeds the RegistrationPanel.
vi.mock('@/lib/registration', () => ({
  registrationState: () => Promise.resolve({ kind: 'anonymous' }),
  requestUpgrade: () => Promise.resolve({ kind: 'sent', email: 'x@x.com' }),
  confirmUpgrade: () => Promise.resolve({ kind: 'registered', pointsRecovered: 0 }),
}))

beforeEach(() => {
  localStorage.clear()
  listMapSightingsMock.mockResolvedValue(FIXTURES)
  submitVerificationMock.mockResolvedValue({ kind: 'validated' })
  getEvidenceUrlMock.mockImplementation((id: string) =>
    Promise.resolve(
      id === 's-approved'
        ? { kind: 'ready', url: 'https://storage.example/signed/photo.jpg', expiresIn: 300 }
        : { kind: 'unavailable' },
    ),
  )
})

vi.mock('@/components/map/BarrioMap', () => ({
  BarrioMap: ({
    sightings,
    onPick,
  }: {
    sightings: MapSightingGeo[]
    onPick: (id: string) => void
  }) => (
    <div>
      {sightings.map((s) => (
        <button key={s.id} aria-label={`pin ${s.id}`} onClick={() => onPick(s.id)}>
          {s.speciesId}
        </button>
      ))}
    </div>
  ),
}))

describe('map screen', () => {
  it('renders the toggle, the legend and the pending list from real data', async () => {
    renderRoute('/mapa')
    expect(await screen.findByText('Avistamientos en La Latina')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avistamientos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mapa de calor' })).toBeInTheDocument()
    expect(screen.getByText('Cerca de ti')).toBeInTheDocument()
    // one pending fixture → the «Cerca de ti» counter and its age line
    expect(await screen.findByText('1 Por verificar')).toBeInTheDocument()
    expect(screen.getByText('La Latina · hace 35 min')).toBeInTheDocument()
  })

  it('opens the detail sheet with approximate location — no author, no exact street', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-approved' }))
    expect(
      await screen.findByText('Ubicación aproximada · La Latina · hace 2 h'),
    ).toBeInTheDocument()
    expect(screen.getByText('Validado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver evidencia' })).toBeInTheDocument()
    // no verify CTA on a validated sighting
    expect(screen.queryByRole('button', { name: '✔ Verificar' })).not.toBeInTheDocument()
    // the public map never reveals the author
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
  })

  it('«Ver evidencia» loads the signed photo on demand — never before', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-approved' }))
    // nothing loaded until asked
    expect(screen.queryByRole('img', { name: /Evidencia/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    const img = await screen.findByRole('img', { name: /Evidencia/ })
    expect(img).toHaveAttribute('src', 'https://storage.example/signed/photo.jpg')
  })

  it('a sighting without a photo shows the friendly unavailable message', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-pending' }))
    await user.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    expect(
      await screen.findByText('Este avistamiento aún no tiene foto disponible'),
    ).toBeInTheDocument()
  })

  it('«Verificar» on the pin card opens the real verification modal (door 1)', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-pending' }))
    await user.click(await screen.findByRole('button', { name: '✔ Verificar' }))
    expect(await screen.findByText('Verificar avistamiento')).toBeInTheDocument()
    expect(
      screen.getByText('Comprueba que no aparezcan personas ni datos privados.'),
    ).toBeInTheDocument()
  })

  it('a «Cerca de ti» row opens the verification modal directly (door 2)', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByText('La Latina · hace 35 min'))
    expect(await screen.findByText('Verificar avistamiento')).toBeInTheDocument()
  })

  it('confirming toasts the validated outcome and re-reads the map (pin stops blinking)', async () => {
    getEvidenceUrlMock.mockResolvedValue({ kind: 'ready', url: 'https://x/p.jpg', expiresIn: 300 })
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-pending' }))
    await user.click(await screen.findByRole('button', { name: '✔ Verificar' }))
    await screen.findByRole('img', { name: /Evidencia/ }) // confirm unlocks with the photo
    const readsBefore = listMapSightingsMock.mock.calls.length
    await user.click(await screen.findByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(submitVerificationMock).toHaveBeenCalledWith('s-pending')
    expect(
      await screen.findByText('Avistamiento validado · +10 para el autor · +5 para ti'),
    ).toBeInTheDocument()
    // the modal closed and the map query was invalidated
    expect(screen.queryByText('Verificar avistamiento')).not.toBeInTheDocument()
    expect(listMapSightingsMock.mock.calls.length).toBeGreaterThan(readsBefore)
  })

  it('the FIRST provisional confirmation opens the invitation; later ones toast (LCHP-30)', async () => {
    submitVerificationMock.mockResolvedValue({ kind: 'saved_provisional' })
    getEvidenceUrlMock.mockResolvedValue({ kind: 'ready', url: 'https://x/p.jpg', expiresIn: 300 })
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-pending' }))
    await user.click(await screen.findByRole('button', { name: '✔ Verificar' }))
    await screen.findByRole('img', { name: /Evidencia/ })
    await user.click(await screen.findByRole('button', { name: /Confirmar \(\+5 pts\)/ }))

    // first time: the invitation modal with the real registration flow inside
    expect(await screen.findByText('Apoyo guardado 🛡')).toBeInTheDocument()
    expect(screen.getByText('Guarda tu cuenta')).toBeInTheDocument()
    expect(localStorage.getItem('lis.invite.first-confirm.seen')).toBe('1')
    expect(
      screen.queryByText('Apoyo guardado · regístrate para que cuente y cobrar tus +5'),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ahora no →' }))

    // second confirmation: the milestone already fired — a discreet toast
    await user.click(await screen.findByRole('button', { name: '✔ Verificar' }))
    await screen.findByRole('img', { name: /Evidencia/ })
    await user.click(await screen.findByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(
      await screen.findByText('Apoyo guardado · regístrate para que cuente y cobrar tus +5'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Apoyo guardado 🛡')).not.toBeInTheDocument()
  })

  it('an already-verified duplicate is told so, without fake success', async () => {
    submitVerificationMock.mockResolvedValue({ kind: 'already_verified' })
    getEvidenceUrlMock.mockResolvedValue({ kind: 'ready', url: 'https://x/p.jpg', expiresIn: 300 })
    const user = userEvent.setup()
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-pending' }))
    await user.click(await screen.findByRole('button', { name: '✔ Verificar' }))
    await screen.findByRole('img', { name: /Evidencia/ })
    await user.click(await screen.findByRole('button', { name: /Confirmar \(\+5 pts\)/ }))
    expect(await screen.findByText('Ya habías verificado este avistamiento')).toBeInTheDocument()
  })

  it('a stale evidence response never renders under a different sighting', async () => {
    const user = userEvent.setup()
    let resolveA: (v: Record<string, unknown>) => void = () => {}
    getEvidenceUrlMock.mockImplementationOnce(() => new Promise((resolve) => (resolveA = resolve)))
    renderRoute('/mapa')
    // ask for A's evidence, then switch selection to B before A resolves
    await user.click(await screen.findByRole('button', { name: 'pin s-approved' }))
    await user.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    await user.click(screen.getByRole('button', { name: 'pin s-pending' }))
    resolveA({ kind: 'ready', url: 'https://storage.example/signed/photo-A.jpg', expiresIn: 300 })
    await new Promise((r) => setTimeout(r, 50))
    // B is selected: A's late photo must NOT appear anywhere
    expect(screen.queryByRole('img', { name: /Evidencia/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Evidencia ·/)).not.toBeInTheDocument()
  })

  it('same-sighting re-taps: the newest evidence request wins even if it resolves first', async () => {
    const user = userEvent.setup()
    const resolvers: ((v: Record<string, unknown>) => void)[] = []
    getEvidenceUrlMock.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)))
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-approved' }))
    await user.click(screen.getByRole('button', { name: 'Ver evidencia' })) // req 1
    await user.click(screen.getByRole('button', { name: 'Ver evidencia' })) // req 2 (newest)
    // newest resolves first, then the older one — the older must not clobber it
    resolvers[1]({ kind: 'ready', url: 'https://storage.example/new.jpg', expiresIn: 300 })
    resolvers[0]({ kind: 'unavailable' })
    await new Promise((r) => setTimeout(r, 50))
    const img = await screen.findByRole('img', { name: /Evidencia/ })
    expect(img).toHaveAttribute('src', 'https://storage.example/new.jpg')
    expect(
      screen.queryByText('Este avistamiento aún no tiene foto disponible'),
    ).not.toBeInTheDocument()
  })

  it('dismissing while loading: a late evidence response does not reopen the overlay', async () => {
    const user = userEvent.setup()
    let resolve: (v: Record<string, unknown>) => void = () => {}
    getEvidenceUrlMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    renderRoute('/mapa')
    await user.click(await screen.findByRole('button', { name: 'pin s-approved' }))
    await user.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    // close the loading overlay before the request resolves
    await user.click(await screen.findByRole('button', { name: 'Cerrar' }))
    resolve({ kind: 'ready', url: 'https://storage.example/late.jpg', expiresIn: 300 })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('img', { name: /Evidencia/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Evidencia ·/)).not.toBeInTheDocument()
  })

  it('a failed map read shows a retryable error, never a fake empty map', async () => {
    listMapSightingsMock.mockRejectedValue(new Error('boom'))
    renderRoute('/mapa')
    expect(
      await screen.findByText('No se pudieron cargar los avistamientos', undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // the lying counter is hidden
    expect(screen.queryByText('0 Por verificar')).not.toBeInTheDocument()
  })

  it('the heat-map toggle hides the markers', async () => {
    const user = userEvent.setup()
    renderRoute('/mapa')
    expect(await screen.findByRole('button', { name: 'pin s-approved' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mapa de calor' }))
    expect(screen.queryByRole('button', { name: 'pin s-approved' })).not.toBeInTheDocument()
    expect(screen.getByText('Mapa de calor · próximamente')).toBeInTheDocument()
  })
})
