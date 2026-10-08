import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapSheet } from './MapSheet'

function renderSheet(open: boolean) {
  const onToggle = vi.fn<(open: boolean) => void>()
  const onHeight = vi.fn<(px: number) => void>()
  render(
    <MapSheet open={open} onToggle={onToggle} onHeight={onHeight} header={<span>cabecera</span>}>
      <span>lista</span>
    </MapSheet>,
  )
  return { onToggle, onHeight }
}

describe('MapSheet', () => {
  it('shows the header always and the content only when open', () => {
    renderSheet(false)
    expect(screen.getByText('cabecera')).toBeInTheDocument()
    expect(screen.queryByText('lista')).not.toBeInTheDocument()
  })

  it('reports the height it covers', () => {
    const { onHeight } = renderSheet(true)
    expect(onHeight).toHaveBeenCalled()
  })

  it('a tap on the handle toggles', async () => {
    const { onToggle } = renderSheet(true)
    await userEvent.click(screen.getByRole('button', { name: 'Plegar la lista' }))
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('a swipe down folds and a swipe up unfolds, without the click toggling it back', () => {
    const { onToggle } = renderSheet(true)
    const handle = screen.getByRole('button', { name: 'Plegar la lista' })
    fireEvent.pointerDown(handle, { clientY: 100 })
    fireEvent.pointerUp(handle, { clientY: 160 })
    fireEvent.click(handle)
    expect(onToggle.mock.calls).toEqual([[false]])
    fireEvent.pointerDown(handle, { clientY: 160 })
    fireEvent.pointerUp(handle, { clientY: 90 })
    fireEvent.click(handle)
    expect(onToggle.mock.calls).toEqual([[false], [true]])
  })
})
