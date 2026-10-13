import { act, render, screen } from '@testing-library/react'
import { PrecisionBadge } from './PrecisionBadge'

afterEach(() => {
  vi.useRealTimers()
})

describe('precision badge', () => {
  it('says the error of a fresh fix', () => {
    render(<PrecisionBadge accuracyM={12.4} at={Date.now()} />)
    const badge = screen.getByText('± 12 m')
    expect(badge).not.toHaveClass('is-warn')
  })

  it('warns above the limit, not at it', () => {
    const view = render(<PrecisionBadge accuracyM={30} at={Date.now()} />)
    expect(screen.getByText('± 30 m')).not.toHaveClass('is-warn')
    view.rerender(<PrecisionBadge accuracyM={31} at={Date.now()} />)
    expect(screen.getByText('± 31 m')).toHaveClass('is-warn')
  })

  it('ages by itself: an old position says how old, and warns', () => {
    vi.useFakeTimers()
    render(<PrecisionBadge accuracyM={12} at={Date.now()} />)
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    expect(screen.getByText('± 12 m')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    expect(screen.getByText('Posición de hace 3 min')).toHaveClass('is-warn')
  })
})
