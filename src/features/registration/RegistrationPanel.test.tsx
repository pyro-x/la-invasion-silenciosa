import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationPanel } from './RegistrationPanel'
import type {
  RegistrationState,
  UpgradeCheckResult,
  UpgradeRequestResult,
} from '@/lib/registration'

const stateMock = vi.fn<() => Promise<RegistrationState>>()
const requestMock = vi.fn<(email: string) => Promise<UpgradeRequestResult>>()
const checkMock = vi.fn<() => Promise<UpgradeCheckResult>>()
const requestedHereMock = vi.fn<() => boolean>()

vi.mock('@/lib/registration', () => ({
  registrationState: () => stateMock(),
  requestUpgrade: (email: string) => requestMock(email),
  checkUpgrade: () => checkMock(),
  upgradeRequestedHere: () => requestedHereMock(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  stateMock.mockResolvedValue({ kind: 'anonymous' })
  requestMock.mockResolvedValue({ kind: 'sent', email: 'rosa@test.local' })
  checkMock.mockResolvedValue({ kind: 'pending' })
  requestedHereMock.mockReturnValue(false)
})

async function requestLink(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Tu correo'), 'rosa@test.local')
  await user.click(screen.getByRole('button', { name: /Enviarme el enlace/ }))
  await screen.findByText(/Te hemos enviado un enlace/)
}

describe('registration panel', () => {
  it('anonymous: explains why and sends the link to the typed email', async () => {
    const user = userEvent.setup()
    render(<RegistrationPanel />)
    expect(await screen.findByText('Guarda tu cuenta')).toBeInTheDocument()
    expect(screen.getByText(/sin contraseña/)).toBeInTheDocument()
    await requestLink(user)
    expect(requestMock).toHaveBeenCalledWith('rosa@test.local')
    expect(screen.getByText(/vuelve a esta pantalla/)).toBeInTheDocument()
    expect(screen.getByText(/spam/)).toBeInTheDocument()
  })

  it('tells the neighbor what the untranslated email looks like', async () => {
    const user = userEvent.setup()
    render(<RegistrationPanel />)
    await requestLink(user)
    expect(screen.getByText(/Supabase Auth/)).toBeInTheDocument()
    expect(screen.getByText(/Confirm your new email address/)).toBeInTheDocument()
  })

  it('asks for no code', async () => {
    const user = userEvent.setup()
    render(<RegistrationPanel />)
    await requestLink(user)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('«Ya lo he abierto» upgrades and celebrates recovered points once the link was opened', async () => {
    const onRegistered = vi.fn()
    const user = userEvent.setup()
    render(<RegistrationPanel onRegistered={onRegistered} />)
    await requestLink(user)
    checkMock.mockResolvedValue({
      kind: 'registered',
      email: 'rosa@test.local',
      pointsRecovered: 15,
    })
    await user.click(screen.getByRole('button', { name: /Ya lo he abierto/ }))
    expect(await screen.findByText('✓ Cuenta guardada')).toBeInTheDocument()
    expect(screen.getByText(/\+15 puntos recuperados/)).toBeInTheDocument()
    expect(onRegistered).toHaveBeenCalledWith(15)
  })

  it('«Ya lo he abierto» before opening the link says so and allows retrying', async () => {
    const user = userEvent.setup()
    render(<RegistrationPanel />)
    await requestLink(user)
    await user.click(screen.getByRole('button', { name: /Ya lo he abierto/ }))
    expect(await screen.findByText(/Aún no nos consta/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reenviar enlace/ })).toBeEnabled()
  })

  it('notices the upgrade by itself when the neighbor comes back to the app', async () => {
    const onRegistered = vi.fn()
    const user = userEvent.setup()
    render(<RegistrationPanel onRegistered={onRegistered} />)
    await requestLink(user)
    checkMock.mockResolvedValue({
      kind: 'registered',
      email: 'rosa@test.local',
      pointsRecovered: 0,
    })
    window.dispatchEvent(new Event('focus'))
    expect(await screen.findByText('✓ Cuenta guardada')).toBeInTheDocument()
    expect(onRegistered).toHaveBeenCalledWith(0)
  })

  it('a silent check that finds nothing shows no error', async () => {
    const user = userEvent.setup()
    render(<RegistrationPanel />)
    await requestLink(user)
    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(checkMock).toHaveBeenCalled())
    expect(screen.queryByText(/Aún no nos consta/)).not.toBeInTheDocument()
  })

  it('an email already registered elsewhere is explained, not mystified', async () => {
    requestMock.mockResolvedValue({ kind: 'email_taken' })
    const user = userEvent.setup()
    render(<RegistrationPanel />)
    await user.type(await screen.findByLabelText('Tu correo'), 'taken@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme el enlace/ }))
    expect(await screen.findByText(/ya tiene una cuenta aquí/)).toBeInTheDocument()
  })

  it('a pending upgrade resumes at the link step across sessions and checks at once', async () => {
    stateMock.mockResolvedValue({ kind: 'pending', email: 'rosa@test.local' })
    render(<RegistrationPanel />)
    expect(await screen.findByText(/Te hemos enviado un enlace/)).toBeInTheDocument()
    expect(screen.getByText('rosa@test.local')).toBeInTheDocument()
    await waitFor(() => expect(checkMock).toHaveBeenCalledTimes(1))
  })

  it('a link opened in this same browser is celebrated on arrival', async () => {
    stateMock.mockResolvedValue({ kind: 'registered', email: 'rosa@test.local' })
    requestedHereMock.mockReturnValue(true)
    checkMock.mockResolvedValue({
      kind: 'registered',
      email: 'rosa@test.local',
      pointsRecovered: 5,
    })
    const onRegistered = vi.fn()
    render(<RegistrationPanel onRegistered={onRegistered} />)
    expect(await screen.findByText(/\+5 puntos recuperados/)).toBeInTheDocument()
    expect(onRegistered).toHaveBeenCalledWith(5)
  })

  it('a registered user sees their saved account, no form, no celebration replay', async () => {
    stateMock.mockResolvedValue({ kind: 'registered', email: 'rosa@test.local' })
    render(<RegistrationPanel />)
    expect(await screen.findByText('✓ Cuenta guardada')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu correo')).not.toBeInTheDocument()
    expect(checkMock).not.toHaveBeenCalled()
  })
})
