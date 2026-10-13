import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationStep } from './LocationStep'

// The MapLibre picker needs WebGL; the step's own logic does not.
vi.mock('@/components/map/LocationPickerMap', () => ({
  LocationPickerMap: () => <div data-testid="picker-map" />,
}))

const noop = () => {}

describe('location step', () => {
  it('shows the age of the position, not a fresh error, once it is old', async () => {
    render(
      <LocationStep
        position={null}
        geo={{
          kind: 'ok',
          position: { lat: 40.4116, lng: -3.7102, accuracyM: 9, at: Date.now() - 3 * 60_000 },
        }}
        onPositionChanged={noop}
        onLocate={noop}
        onNext={noop}
      />,
    )
    expect(await screen.findByText('Posición de hace 3 min')).toHaveClass('is-warn')
    expect(screen.queryByText('± 9 m')).not.toBeInTheDocument()
  })

  it('a watch paused behind the step asks again, and the ask is the tap that restarts it', async () => {
    const user = userEvent.setup()
    const onLocate = vi.fn()
    render(
      <LocationStep
        position={null}
        geo={{ kind: 'paused', position: null }}
        onPositionChanged={noop}
        onLocate={onLocate}
        onNext={noop}
      />,
    )
    expect(
      await screen.findByText('Para seguir jugando, el mapa tiene que volver a saber dónde estás.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Volver a mi posición/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
    expect(onLocate).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
  })
})
