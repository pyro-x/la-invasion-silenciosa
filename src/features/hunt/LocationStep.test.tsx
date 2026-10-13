import { render, screen } from '@testing-library/react'
import { LocationStep } from './LocationStep'

// The MapLibre picker needs WebGL; the step's own logic does not.
vi.mock('@/components/map/LocationPickerMap', () => ({
  LocationPickerMap: () => <div data-testid="picker-map" />,
}))

const noop = () => {}

describe('location step', () => {
  it("keeps the age of the gate's fix: minutes later the badge says so", async () => {
    render(
      <LocationStep
        position={null}
        approxOnly
        primedFix={{
          kind: 'ok',
          lat: 40.4116,
          lng: -3.7102,
          accuracyM: 9,
          at: Date.now() - 3 * 60_000,
        }}
        onFix={noop}
        onPositionChanged={noop}
        onApproxToggled={noop}
        onNext={noop}
      />,
    )
    expect(await screen.findByText('Posición de hace 3 min')).toHaveClass('is-warn')
    expect(screen.queryByText('± 9 m')).not.toBeInTheDocument()
  })
})
