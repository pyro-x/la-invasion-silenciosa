import { render } from '@testing-library/react'
import { PickerMap } from './PickerMap'
import type { BarrioMapController, BarrioMapHandlers, BarrioMapOptions } from './createBarrioMap'

const calls = vi.hoisted(() => ({
  log: [] as string[],
  handlers: null as BarrioMapHandlers | null,
  options: null as BarrioMapOptions | null,
}))

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('./createBarrioMap', () => ({
  createBarrioMap: (
    _container: HTMLElement,
    handlers: BarrioMapHandlers,
    options: BarrioMapOptions,
  ): BarrioMapController => {
    calls.handlers = handlers
    calls.options = options
    return controllerStub
  },
}))

const controllerStub = vi.hoisted((): BarrioMapController => ({
  setSightings: () => {},
  setSelected: () => {},
  setHeat: () => {},
  setMe: (me, rangeM) => calls.log.push(`me ${me ? me.lat : null} ${rangeM}`),
  metresFromCentre: () => 0,
  isMoving: () => false,
  setPadding: (px, topPx) => calls.log.push(`padding ${topPx} ${px}`),
  goTo: () => {},
  follow: (target, minZoom) => calls.log.push(`follow ${target.lat} ${minZoom}`),
  zoomBy: () => {},
  destroy: () => calls.log.push('destroy'),
}))

const HERE = { lat: 40.4116, lng: -3.7102 }

type Props = Parameters<typeof PickerMap>[0]

const base: Props = {
  initialCenter: HERE,
  flyTo: null,
  me: null,
  rangeM: 50,
  padding: { top: 0, bottom: 0 },
  onUserMove: () => {},
  onCenterChanged: () => {},
}

beforeEach(() => {
  calls.log.length = 0
  calls.handlers = null
  calls.options = null
})

describe('PickerMap (LCHP-36)', () => {
  it('opens the controller in picker mode on the given centre, at street zoom', () => {
    render(<PickerMap {...base} />)
    expect(calls.options).toEqual({ mode: 'picker', center: HERE, zoom: 17 })
  })

  it('hands the gesture and the settled centre to the step', () => {
    const onUserMove = vi.fn()
    const onCenterChanged = vi.fn()
    render(<PickerMap {...base} onUserMove={onUserMove} onCenterChanged={onCenterChanged} />)
    calls.handlers?.onUserMove()
    calls.handlers?.onCenterChanged?.(HERE, true, 16.5)
    expect(onUserMove).toHaveBeenCalledTimes(1)
    expect(onCenterChanged).toHaveBeenCalledWith(HERE, true, 16.5)
  })

  it('pushes the header card and the dock as the padding, top and bottom', () => {
    const { rerender } = render(<PickerMap {...base} padding={{ top: 90, bottom: 220 }} />)
    expect(calls.log).toContain('padding 90 220')
    rerender(<PickerMap {...base} padding={{ top: 90, bottom: 260 }} />)
    expect(calls.log.at(-1)).toBe('padding 90 260')
  })

  it('flies to a new target at street zoom, once per target', () => {
    const target = { lat: 40.412, lng: -3.71 }
    const { rerender } = render(<PickerMap {...base} flyTo={target} />)
    rerender(<PickerMap {...base} flyTo={target} padding={{ top: 0, bottom: 10 }} />)
    expect(calls.log.filter((line) => line.startsWith('follow'))).toEqual(['follow 40.412 17'])
  })
})
