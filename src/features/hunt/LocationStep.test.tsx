import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationStep } from './LocationStep'

// The MapLibre picker needs WebGL; the step's own logic does not. The stub
// reports the barrio frame's centre on load, as the real map does when it
// could not open where it was asked to.
const reported = vi.hoisted(() => ({ centre: { lat: 40.4118, lng: -3.7105 }, sent: false }))
vi.mock('@/components/map/PickerMap', () => ({
  PICK_ZOOM: 17,
  PickerMap: ({
    onCenterChanged,
  }: {
    onCenterChanged: (center: { lat: number; lng: number }, byUser: boolean, zoom: number) => void
  }) => {
    // the load report, once, as the real map's
    if (!reported.sent) {
      reported.sent = true
      onCenterChanged(reported.centre, false, 17)
    }
    return <div data-testid="picker-map" />
  },
}))

beforeEach(() => {
  reported.sent = false
})

const noop = () => {}
const HERE = { lat: 40.4116, lng: -3.7102, accuracyM: 9, at: Date.now() }

describe('location step', () => {
  it('shows the age of the position, not a fresh error, once it is old', async () => {
    render(
      <LocationStep
        header={null}
        position={null}
        geo={{ kind: 'ok', position: { ...HERE, at: Date.now() - 3 * 60_000 } }}
        onPositionChanged={noop}
        onLocate={noop}
        onNext={noop}
      />,
    )
    expect(await screen.findByText('Posición de hace 3 min')).toHaveClass('is-warn')
    expect(screen.queryByText('± 9 m')).not.toBeInTheDocument()
  })

  it('the position it opens on is its position at once; a settle elsewhere is the pin, by hand', async () => {
    const onPositionChanged = vi.fn()
    render(
      <LocationStep
        header={null}
        position={null}
        geo={{ kind: 'ok', position: HERE }}
        onPositionChanged={onPositionChanged}
        onLocate={noop}
        onNext={noop}
      />,
    )
    await screen.findByTestId('picker-map')
    // the opening position, tagged GPS with its accuracy; the map's report of
    // another centre is the pin where it settled, with no GPS claim (D-052)
    expect(onPositionChanged).toHaveBeenCalledTimes(2)
    expect(onPositionChanged).toHaveBeenCalledWith({
      lat: HERE.lat,
      lng: HERE.lng,
      accuracyM: 9,
      source: 'gps',
    })
    expect(onPositionChanged).toHaveBeenCalledWith({
      ...reported.centre,
      accuracyM: null,
      source: 'manual',
    })
  })

  it('a watch still searching says so, and offers nothing to tap yet', async () => {
    render(
      <LocationStep
        header={null}
        position={null}
        geo={{ kind: 'searching', position: null }}
        onPositionChanged={noop}
        onLocate={noop}
        onNext={noop}
      />,
    )
    expect(await screen.findByText('Buscando tu posición…')).toBeInTheDocument()
    expect(
      screen.queryByText('Activa tu ubicación para situar la criatura'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Volver a mi posición|Usar mi ubicación/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revisa y envía/ })).toBeDisabled()
  })

  it('a watch paused behind the step asks again, and the ask is the tap that restarts it', async () => {
    const user = userEvent.setup()
    const onLocate = vi.fn()
    render(
      <LocationStep
        header={null}
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
