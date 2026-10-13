import { render } from '@testing-library/react'
import { BarrioMap } from './BarrioMap'
import type { BarrioMapController } from './createBarrioMap'
import type { MapSightingGeo } from '@/types/sighting'

const calls = vi.hoisted(() => ({ log: [] as string[], fromCentreM: 500 }))

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('./createBarrioMap', () => ({
  createBarrioMap: (): BarrioMapController => ({
    setSightings: (sightings) =>
      calls.log.push(`sightings ${sightings.map((s) => s.id).join(',')}`),
    setSelected: (id) => calls.log.push(`selected ${id}`),
    setHeat: (on) => calls.log.push(`heat ${on}`),
    setMe: (me, rangeM) => calls.log.push(`me ${me ? me.lat : null} ${rangeM}`),
    metresFromCentre: () => calls.fromCentreM,
    setBottomPadding: (px) => calls.log.push(`padding ${px}`),
    goTo: (target) => calls.log.push(`goTo ${target.id} ${target.lat}`),
    follow: (target, minZoom) => calls.log.push(`follow ${target.lat} ${minZoom}`),
    zoomBy: (delta) => calls.log.push(`zoomBy ${delta}`),
    destroy: () => calls.log.push('destroy'),
  }),
}))

const SIGHTINGS: MapSightingGeo[] = [
  {
    id: 'a',
    speciesId: 'candadin',
    lat: 40.411,
    lng: -3.71,
    status: 'pending',
    verificationCount: 0,
    createdAt: new Date().toISOString(),
  },
]

type Props = Parameters<typeof BarrioMap>[0]

const base: Props = {
  sightings: SIGHTINGS,
  selectedId: null,
  heat: false,
  onPick: () => {},
  onMapTap: () => {},
  onUserMove: () => {},
  me: null,
  rangeM: 85,
  follow: false,
  mayResumeFollow: true,
  onResumeFollow: () => {},
  followRequest: 0,
  bottomPadding: 0,
  focus: null,
  zoomStep: null,
}

beforeEach(() => {
  calls.log.length = 0
  calls.fromCentreM = 500
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BarrioMap', () => {
  it('pushes its props into the controller and draws no pin itself', () => {
    const view = render(<BarrioMap {...base} />)
    expect(calls.log).toEqual([
      'sightings a',
      'selected null',
      'heat false',
      'me null 85',
      'padding 0',
    ])
    expect(view.container.querySelectorAll('svg, button')).toHaveLength(0)
    calls.log.length = 0
    view.rerender(
      <BarrioMap
        {...base}
        selectedId="a"
        heat
        bottomPadding={280}
        focus={{ id: 'a', lat: 40.411, lng: -3.71 }}
        zoomStep={{ delta: 1 }}
      />,
    )
    expect(calls.log).toEqual([
      'selected a',
      'heat true',
      'padding 280',
      'goTo a 40.411',
      'zoomBy 1',
    ])
    view.unmount()
    expect(calls.log.at(-1)).toBe('destroy')
  })

  it('zooms in on each tap on locate, then only recentres on later fixes', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    const view = render(<BarrioMap {...base} me={me} />)
    calls.log.length = 0
    const moves = () => calls.log.filter((line) => line.startsWith('follow'))
    view.rerender(<BarrioMap {...base} me={me} follow followRequest={1} />)
    const next = { ...me, lat: 40.4116 }
    view.rerender(<BarrioMap {...base} me={next} follow followRequest={1} />)
    expect(moves()).toEqual(['follow 40.4115 17', 'follow 40.4116 undefined'])
    // a tap while following brings the same position object again
    view.rerender(<BarrioMap {...base} me={next} follow followRequest={2} />)
    expect(moves().at(-1)).toBe('follow 40.4116 17')
    view.rerender(<BarrioMap {...base} me={{ ...me, lat: 40.4117 }} followRequest={2} />)
    expect(moves()).toHaveLength(3)
  })

  it('follows from the first fix without a tap, at street level', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    render(<BarrioMap {...base} me={me} follow />)
    expect(calls.log).toContain('follow 40.4115 17')
  })

  it('a vague fix only zooms to the barrio; the street waits for a good one', () => {
    const vague = { lat: 40.4115, lng: -3.712, accuracyM: 400 }
    const view = render(<BarrioMap {...base} me={vague} follow />)
    const moves = () => calls.log.filter((line) => line.startsWith('follow'))
    expect(moves()).toEqual(['follow 40.4115 15'])
    view.rerender(<BarrioMap {...base} me={{ ...vague, accuracyM: 14 }} follow />)
    expect(moves().at(-1)).toBe('follow 40.4115 17')
    view.rerender(<BarrioMap {...base} me={{ ...vague, lat: 40.4116, accuracyM: 14 }} follow />)
    expect(moves().at(-1)).toBe('follow 40.4116 undefined')
  })

  it('does not move the map for GPS noise', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    const view = render(<BarrioMap {...base} me={me} follow />)
    calls.log.length = 0
    calls.fromCentreM = 0.3
    view.rerender(<BarrioMap {...base} me={{ ...me }} follow />)
    expect(calls.log.filter((line) => line.startsWith('follow'))).toEqual([])
  })

  describe('following comes back by itself', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }

    function leftAlone(props: Partial<Props> = {}) {
      vi.useFakeTimers()
      const onResumeFollow = vi.fn()
      const view = render(
        <BarrioMap {...base} me={me} onResumeFollow={onResumeFollow} {...props} />,
      )
      const fix = (extra: Partial<Props> = {}) =>
        view.rerender(
          <BarrioMap
            {...base}
            me={{ ...me }}
            onResumeFollow={onResumeFollow}
            {...props}
            {...extra}
          />,
        )
      return { onResumeFollow, fix }
    }

    it('not while the neighbour has just touched the map', () => {
      const { onResumeFollow, fix } = leftAlone()
      vi.advanceTimersByTime(9_000)
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
    })

    it('once the map was left alone and the neighbour is out of what it shows', () => {
      const { onResumeFollow, fix } = leftAlone()
      vi.advanceTimersByTime(10_001)
      fix()
      expect(onResumeFollow).toHaveBeenCalledTimes(1)
    })

    it('not while the neighbour is still inside the ring around the centre', () => {
      const { onResumeFollow, fix } = leftAlone()
      calls.fromCentreM = 60
      vi.advanceTimersByTime(10_001)
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
    })

    it('not while a creature is open, and picking one counts as touching the map', () => {
      const { onResumeFollow, fix } = leftAlone({ mayResumeFollow: false })
      vi.advanceTimersByTime(10_001)
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
      // the card is closed: that is a touch, so the wait starts again
      fix({ mayResumeFollow: true, selectedId: 'a' })
      fix({ mayResumeFollow: true, selectedId: null })
      expect(onResumeFollow).not.toHaveBeenCalled()
      vi.advanceTimersByTime(10_001)
      fix({ mayResumeFollow: true, selectedId: null })
      expect(onResumeFollow).toHaveBeenCalledTimes(1)
    })
  })
})
