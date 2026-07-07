import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { PendingValueBanner } from './PendingValueBanner'
import type { RegistrationState } from '@/lib/registration'

const stateMock = vi.fn<() => Promise<RegistrationState>>()
const countMock = vi.fn<() => Promise<number>>()

vi.mock('@/lib/registration', () => ({
  registrationState: () => stateMock(),
}))
vi.mock('@/services/verifications.service', () => ({
  countOwnProvisionalConfirmations: () => countMock(),
}))

function renderBanner() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PendingValueBanner />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  stateMock.mockResolvedValue({ kind: 'anonymous' })
  countMock.mockResolvedValue(2)
})

describe('pending-value banner (Perfil)', () => {
  it('shows the real endowed progress: N apoyos and their +5s', async () => {
    renderBanner()
    expect(await screen.findByText('2 apoyos vecinales')).toBeInTheDocument()
    expect(screen.getByText('+10 puntos')).toBeInTheDocument()
  })

  it('singular form for one support', async () => {
    countMock.mockResolvedValue(1)
    renderBanner()
    expect(await screen.findByText('1 apoyo vecinal')).toBeInTheDocument()
    expect(screen.getByText('+5 puntos')).toBeInTheDocument()
  })

  it('renders nothing without pending value', async () => {
    countMock.mockResolvedValue(0)
    const { container } = renderBanner()
    await new Promise((r) => setTimeout(r, 30))
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for registered users — and never even counts', async () => {
    stateMock.mockResolvedValue({ kind: 'registered', email: 'rosa@test.local' })
    const { container } = renderBanner()
    await new Promise((r) => setTimeout(r, 30))
    expect(container).toBeEmptyDOMElement()
    expect(countMock).not.toHaveBeenCalled()
  })
})
