import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { BarrioMap } from './BarrioMap'
import type { BarrioMapController, BarrioMapHandlers } from './createBarrioMap'
import { keepMapSession, mapSession } from '@/lib/mapSession'
import type { MapSightingGeo } from '@/types/sighting'

const calls = vi.hoisted(() => ({
  log: [] as string[],
  fromCentreM: 500,
  moving: false,
  handlers: null as BarrioMapHandlers | null,
}))

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('./createBarrioMap', () => ({
  createBarrioMap: (_container: HTMLElement, handlers: BarrioMapHandlers): BarrioMapController => {
    calls.handlers = handlers
    return controllerStub
  },
}))

const controllerStub = vi.hoisted((): BarrioMapController => ({
  setSightings: (sightings) => calls.log.push(`sightings ${sightings.map((s) => s.id).join(',')}`),
  setSelected: (id) => calls.log.push(`selected ${id}`),
  setHeat: (on) => calls.log.push(`heat ${on}`),
  setMe: (me, rangeM) => calls.log.push(`me ${me ? me.lat : null} ${rangeM}`),
  metresFromCentre: () => calls.fromCentreM,
  isMoving: () => calls.moving,
  setPadding: (px) => calls.log.push(`padding ${px}`),
  goTo: (target) => calls.log.push(`goTo ${target.id} ${target.lat}`),
  follow: (target, minZoom) => calls.log.push(`follow ${target.lat} ${minZoom}`),
  zoomBy: (delta) => calls.log.push(`zoomBy ${delta}`),
  destroy: () => calls.log.push('destroy'),
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
  calls.moving = false
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

  it('while fixes stay vague only the first one is a zoom request', () => {
    const vague = { lat: 40.4115, lng: -3.712, accuracyM: 400 }
    const view = render(<BarrioMap {...base} me={vague} follow />)
    view.rerender(<BarrioMap {...base} me={{ ...vague, lat: 40.4116 }} follow />)
    expect(calls.log.filter((line) => line.startsWith('follow'))).toEqual([
      'follow 40.4115 15',
      'follow 40.4116 undefined',
    ])
  })

  it('a neighbour who took the map before the first fix is not zoomed in when following returns', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    // the first fix arrives with following already off
    const view = render(<BarrioMap {...base} me={me} />)
    view.rerender(<BarrioMap {...base} me={{ ...me }} follow />)
    expect(calls.log.filter((line) => line.startsWith('follow'))).toEqual([
      'follow 40.4115 undefined',
    ])
  })

  it("StrictMode's second map still gets the zoom-in the first one spent", () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    render(
      <StrictMode>
        <BarrioMap {...base} me={me} follow />
      </StrictMode>,
    )
    const afterRemount = calls.log.slice(calls.log.lastIndexOf('destroy') + 1)
    expect(afterRemount).toContain('follow 40.4115 17')
  })

  it('a neighbour who took the map while the street zoom was owed has spent it too', () => {
    const vague = { lat: 40.4115, lng: -3.712, accuracyM: 400 }
    const view = render(<BarrioMap {...base} me={vague} follow />)
    view.rerender(<BarrioMap {...base} me={{ ...vague }} />)
    view.rerender(<BarrioMap {...base} me={{ ...vague, accuracyM: 14 }} follow />)
    expect(calls.log.filter((line) => line.startsWith('follow'))).toEqual([
      'follow 40.4115 15',
      'follow 40.4115 undefined',
    ])
  })

  it('does not move the map for GPS noise', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    const view = render(<BarrioMap {...base} me={me} follow />)
    calls.log.length = 0
    calls.fromCentreM = 0.3
    view.rerender(<BarrioMap {...base} me={{ ...me }} follow />)
    expect(calls.log.filter((line) => line.startsWith('follow'))).toEqual([])
  })

  describe('coming back to the map (LCHP-56)', () => {
    const me = { lat: 40.4115, lng: -3.712, accuracyM: 12 }
    const view = { center: [-3.712, 40.4115] as [number, number], zoom: 16 }
    const moves = () => calls.log.filter((line) => line.startsWith('follow'))

    it('leaving says whether the zoom-in was spent, and whether the street zoom is still owed', () => {
      const spent = render(<BarrioMap {...base} me={me} follow />)
      spent.unmount()
      expect(mapSession()).toMatchObject({ zoomSpent: true, streetOwed: false })

      const owed = render(<BarrioMap {...base} me={{ ...me, accuracyM: 400 }} follow />)
      owed.unmount()
      expect(mapSession()).toMatchObject({ zoomSpent: true, streetOwed: true })

      const unused = render(<BarrioMap {...base} />)
      unused.unmount()
      expect(mapSession()).toMatchObject({ zoomSpent: false, streetOwed: false })
    })

    it('a map opened on the view it was left with only recentres: the zoom-in is not given twice', () => {
      keepMapSession({ view, zoomSpent: true })
      const back = render(<BarrioMap {...base} follow />)
      back.rerender(<BarrioMap {...base} me={me} follow />)
      expect(moves()).toEqual(['follow 40.4115 undefined'])
    })

    it('a position that has not moved off the kept view does not move the map at all', () => {
      keepMapSession({ view, zoomSpent: true })
      calls.fromCentreM = 0
      render(<BarrioMap {...base} me={me} follow />)
      expect(moves()).toEqual([])
    })

    it('a tap on «Ir a mi posición» after coming back still zooms in', () => {
      keepMapSession({ view, zoomSpent: true })
      const back = render(<BarrioMap {...base} me={me} follow />)
      back.rerender(<BarrioMap {...base} me={me} follow followRequest={1} />)
      expect(moves()).toEqual(['follow 40.4115 undefined', 'follow 40.4115 17'])
    })

    it('the street zoom a vague position left owed is given by the first good one after coming back', () => {
      keepMapSession({ view, zoomSpent: true, streetOwed: true })
      const back = render(<BarrioMap {...base} me={{ ...me, accuracyM: 400 }} follow />)
      back.rerender(<BarrioMap {...base} me={me} follow />)
      expect(moves()).toEqual(['follow 40.4115 undefined', 'follow 40.4115 17'])
    })

    it('a zoom-in never given is still given: the map was left before any position', () => {
      keepMapSession({ view, zoomSpent: false })
      render(<BarrioMap {...base} me={me} follow />)
      expect(moves()).toEqual(['follow 40.4115 17'])
    })

    it('without a kept view a spent zoom-in means nothing: a fresh map zooms in', () => {
      keepMapSession({ view: null, zoomSpent: true })
      render(<BarrioMap {...base} me={me} follow />)
      expect(moves()).toEqual(['follow 40.4115 17'])
    })

    it('after coming back, a first position within the wait does not bring following back', () => {
      vi.useFakeTimers()
      keepMapSession({ view, zoomSpent: true, following: false })
      const onResumeFollow = vi.fn()
      const back = render(<BarrioMap {...base} onResumeFollow={onResumeFollow} />)
      vi.advanceTimersByTime(3_000)
      back.rerender(<BarrioMap {...base} me={me} onResumeFollow={onResumeFollow} />)
      expect(onResumeFollow).not.toHaveBeenCalled()
      expect(moves()).toEqual([])
      vi.advanceTimersByTime(10_001)
      back.rerender(<BarrioMap {...base} me={{ ...me }} onResumeFollow={onResumeFollow} />)
      expect(onResumeFollow).toHaveBeenCalledTimes(1)
    })
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

    it('not under a hand, and the wait counts from the hand leaving the map', () => {
      const { onResumeFollow, fix } = leftAlone()
      calls.handlers?.onUserMove()
      calls.moving = true
      vi.advanceTimersByTime(12_000)
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
      // the finger lifts after twelve seconds of dragging
      calls.moving = false
      calls.handlers?.onUserSettled()
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
      vi.advanceTimersByTime(10_001)
      fix()
      expect(onResumeFollow).toHaveBeenCalledTimes(1)
    })

    it('a drag long after arriving starts the wait again', () => {
      const { onResumeFollow, fix } = leftAlone()
      vi.advanceTimersByTime(60_000)
      calls.handlers?.onUserMove()
      calls.handlers?.onUserSettled()
      vi.advanceTimersByTime(5_000)
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
    })

    it('the start of a move is a touch on its own, before it has ended', () => {
      const { onResumeFollow, fix } = leftAlone()
      vi.advanceTimersByTime(60_000)
      calls.handlers?.onUserMove()
      vi.advanceTimersByTime(5_000)
      fix()
      expect(onResumeFollow).not.toHaveBeenCalled()
    })

    it('a zoom button counts as touching the map', () => {
      const { onResumeFollow, fix } = leftAlone()
      vi.advanceTimersByTime(10_001)
      fix({ zoomStep: { delta: 1 } })
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
