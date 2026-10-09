import { render } from '@testing-library/react'
import { BarrioMap } from './BarrioMap'
import type { BarrioMapController } from './createBarrioMap'
import type { MapSightingGeo } from '@/types/sighting'

const calls = vi.hoisted(() => ({ log: [] as string[] }))

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('./createBarrioMap', () => ({
  createBarrioMap: (): BarrioMapController => ({
    setSightings: (sightings) =>
      calls.log.push(`sightings ${sightings.map((s) => s.id).join(',')}`),
    setSelected: (id) => calls.log.push(`selected ${id}`),
    setHeat: (on) => calls.log.push(`heat ${on}`),
    setMe: (me) => calls.log.push(`me ${me ? me.lat : null}`),
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
  follow: false,
  followRequest: 0,
  bottomPadding: 0,
  focus: null,
  zoomStep: null,
}

beforeEach(() => {
  calls.log.length = 0
})

describe('BarrioMap', () => {
  it('pushes its props into the controller and draws no pin itself', () => {
    const view = render(<BarrioMap {...base} />)
    expect(calls.log).toEqual([
      'sightings a',
      'selected null',
      'heat false',
      'me null',
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
})
