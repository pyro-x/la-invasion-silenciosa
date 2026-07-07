import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationPanel } from './RegistrationPanel'
import type {
  ConfirmUpgradeResult,
  RegistrationState,
  UpgradeRequestResult,
} from '@/lib/registration'

const stateMock = vi.fn<() => Promise<RegistrationState>>()
const requestMock = vi.fn<(email: string) => Promise<UpgradeRequestResult>>()
const confirmMock = vi.fn<(email: string, token: string) => Promise<ConfirmUpgradeResult>>()

vi.mock('@/lib/registration', () => ({
  registrationState: () => stateMock(),
  requestUpgrade: (email: string) => requestMock(email),
  confirmUpgrade: (email: string, token: string) => confirmMock(email, token),
}))

beforeEach(() => {
  vi.clearAllMocks()
  stateMock.mockResolvedValue({ kind: 'anonymous' })
  requestMock.mockResolvedValue({ kind: 'sent', email: 'rosa@test.local' })
  confirmMock.mockResolvedValue({ kind: 'registered', pointsRecovered: 0 })
})

// The panel invalidates registration/profile queries on success, so it needs
// a query client — returned so tests can assert the invalidation.
function renderPanel(onRegistered?: (points: number) => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RegistrationPanel onRegistered={onRegistered} />
    </QueryClientProvider>,
  )
  return queryClient
}

describe('registration panel', () => {
  it('anonymous: explains why and sends the code to the typed email', async () => {
    const user = userEvent.setup()
    renderPanel()
    expect(await screen.findByText('Guarda tu cuenta')).toBeInTheDocument()
    expect(screen.getByText(/sin contraseña/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Tu correo'), 'rosa@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme un código/ }))
    expect(requestMock).toHaveBeenCalledWith('rosa@test.local')
    expect(await screen.findByText(/Te hemos enviado un código/)).toBeInTheDocument()
    expect(screen.getByText(/spam/)).toBeInTheDocument()
  })

  it('confirming a valid code upgrades and celebrates recovered points', async () => {
    confirmMock.mockResolvedValue({ kind: 'registered', pointsRecovered: 15 })
    const onRegistered = vi.fn()
    const user = userEvent.setup()
    renderPanel(onRegistered)
    await user.type(await screen.findByLabelText('Tu correo'), 'rosa@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme un código/ }))
    await user.type(await screen.findByLabelText('Código del correo'), '123456')
    await user.click(screen.getByRole('button', { name: /Confirmar código/ }))
    expect(confirmMock).toHaveBeenCalledWith('rosa@test.local', '123456')
    expect(await screen.findByText('✓ Cuenta guardada')).toBeInTheDocument()
    expect(screen.getByText(/\+15 puntos recuperados/)).toBeInTheDocument()
    expect(onRegistered).toHaveBeenCalledWith(15)
  })

  it('a wrong code shows the friendly error and allows retrying', async () => {
    confirmMock.mockResolvedValue({ kind: 'bad_code' })
    const user = userEvent.setup()
    renderPanel()
    await user.type(await screen.findByLabelText('Tu correo'), 'rosa@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme un código/ }))
    await user.type(await screen.findByLabelText('Código del correo'), '999999')
    await user.click(screen.getByRole('button', { name: /Confirmar código/ }))
    expect(await screen.findByText(/no es válido o ha caducado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reenviar código/ })).toBeEnabled()
  })

  it('an email already registered elsewhere is explained, not mystified', async () => {
    requestMock.mockResolvedValue({ kind: 'email_taken' })
    const user = userEvent.setup()
    renderPanel()
    await user.type(await screen.findByLabelText('Tu correo'), 'taken@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme un código/ }))
    expect(await screen.findByText(/ya tiene una cuenta aquí/)).toBeInTheDocument()
  })

  it('a pending upgrade resumes at the code step across sessions', async () => {
    stateMock.mockResolvedValue({ kind: 'pending', email: 'rosa@test.local' })
    renderPanel()
    expect(await screen.findByText(/Te hemos enviado un código/)).toBeInTheDocument()
    expect(screen.getByText('rosa@test.local')).toBeInTheDocument()
  })

  it('a registered user sees their saved account, no form', async () => {
    stateMock.mockResolvedValue({ kind: 'registered', email: 'rosa@test.local' })
    renderPanel()
    expect(await screen.findByText('✓ Cuenta guardada')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu correo')).not.toBeInTheDocument()
  })

  it('the code input only accepts digits, gates at 6 and tolerates 8 (hosted rollout skew)', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.type(await screen.findByLabelText('Tu correo'), 'rosa@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme un código/ }))
    const codeInput = await screen.findByLabelText('Código del correo')
    await user.type(codeInput, '12ab34')
    expect(codeInput).toHaveValue('1234')
    expect(screen.getByRole('button', { name: /Confirmar código/ })).toBeDisabled()
    await user.type(codeInput, '56')
    expect(screen.getByRole('button', { name: /Confirmar código/ })).toBeEnabled()
    // an 8-digit code (hosted default until its config is patched) still fits
    await user.type(codeInput, '78')
    expect(codeInput).toHaveValue('12345678')
    expect(screen.getByRole('button', { name: /Confirmar código/ })).toBeEnabled()
  })

  it('a successful upgrade invalidates registration + profile queries (Perfil banner refresh)', async () => {
    const user = userEvent.setup()
    const queryClient = renderPanel()
    queryClient.setQueryData(['registration', 'pending-value'], { show: true, count: 2 })
    queryClient.setQueryData(['profile'], { points: 0 })
    await user.type(await screen.findByLabelText('Tu correo'), 'rosa@test.local')
    await user.click(screen.getByRole('button', { name: /Enviarme un código/ }))
    await user.type(await screen.findByLabelText('Código del correo'), '123456')
    await user.click(screen.getByRole('button', { name: /Confirmar código/ }))
    await screen.findByText('✓ Cuenta guardada')
    expect(queryClient.getQueryState(['registration', 'pending-value'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['profile'])?.isInvalidated).toBe(true)
  })
})
