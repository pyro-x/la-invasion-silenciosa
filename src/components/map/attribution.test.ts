import maplibregl from 'maplibre-gl'
import { addAttribution, FOLD_AFTER_MS, foldAttribution, foldWhenAllowed } from './attribution'

type MapHandler = (event: { originalEvent?: Event }) => void

const recorded = vi.hoisted(() => ({
  controlOptions: [] as { compact?: boolean }[],
  handlers: {} as Record<string, MapHandler[]>,
}))

vi.mock('maplibre-gl', () => {
  class AttributionControl {
    constructor(options: { compact?: boolean }) {
      recorded.controlOptions.push(options)
    }
  }
  class Map {
    container = document.createElement('div')
    on(type: string, handler: MapHandler) {
      ;(recorded.handlers[type] ??= []).push(handler)
    }
    addControl() {}
    getContainer() {
      return this.container
    }
  }
  return { default: { Map, AttributionControl } }
})

const EXPANDED = 'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show'
// What MapLibre renders before the tile metadata (and its credit) arrives.
const EMPTY = 'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-attrib-empty'

function renderControl(container: HTMLElement, classes: string): Element {
  container.innerHTML = `<details class="${classes}" open><summary></summary><div>© OpenMapTiles</div></details>`
  const control = container.firstElementChild
  if (!control) throw new Error('control not rendered')
  return control
}

function mapContainerWithControl(classes: string): { container: HTMLElement; control: Element } {
  const container = document.createElement('div')
  return { container, control: renderControl(container, classes) }
}

function fakeSignals() {
  const listeners: { creditRendered: (() => void)[]; userMove: (() => void)[] } = {
    creditRendered: [],
    userMove: [],
  }
  return {
    signals: {
      onCreditRendered: (listener: () => void) => void listeners.creditRendered.push(listener),
      onUserMove: (listener: () => void) => void listeners.userMove.push(listener),
    },
    creditRendered: () => listeners.creditRendered.forEach((listener) => listener()),
    userMove: () => listeners.userMove.forEach((listener) => listener()),
  }
}

const isExpanded = (control: Element) => control.classList.contains('maplibregl-compact-show')
const reopen = (control: Element) => control.classList.add('maplibregl-compact-show')

function setTabVisible(visible: boolean) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visible ? 'visible' : 'hidden')
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('foldAttribution', () => {
  it('minimises the expanded compact control and keeps the (i) button', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    foldAttribution(container)
    expect(isExpanded(control)).toBe(false)
    expect(control.classList.contains('maplibregl-compact')).toBe(true)
    expect(container.contains(control)).toBe(true)
  })

  it('is a no-op when the map has no attribution control yet', () => {
    expect(() => foldAttribution(document.createElement('div'))).not.toThrow()
  })
})

describe('foldWhenAllowed', () => {
  it('waits five seconds, the minimum the OSM guidelines allow', () => {
    expect(FOLD_AFTER_MS).toBe(5000)
  })

  it('keeps the credit open for five full seconds, then folds it', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.creditRendered()

    vi.advanceTimersByTime(4999)
    expect(isExpanded(control)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isExpanded(control)).toBe(false)
  })

  it('starts the clock only once the credit is on screen (slow tile metadata)', () => {
    const { container, control } = mapContainerWithControl(EMPTY)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)

    map.creditRendered()
    vi.advanceTimersByTime(10_000)
    control.className = EXPANDED
    expect(isExpanded(control)).toBe(true)

    map.creditRendered()
    vi.advanceTimersByTime(4999)
    expect(isExpanded(control)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isExpanded(control)).toBe(false)
  })

  it('does not restart the clock on later tile loads', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.creditRendered()
    vi.advanceTimersByTime(4000)
    map.creditRendered()
    vi.advanceTimersByTime(1000)
    expect(isExpanded(control)).toBe(false)
  })

  it('does not count time in a hidden tab: the five seconds restart on return', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.creditRendered()

    vi.advanceTimersByTime(1000)
    setTabVisible(false)
    vi.advanceTimersByTime(60_000)
    expect(isExpanded(control)).toBe(true)

    setTabVisible(true)
    vi.advanceTimersByTime(4999)
    expect(isExpanded(control)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isExpanded(control)).toBe(false)
  })

  it('does not start the clock in a tab that loads hidden', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    setTabVisible(false)
    foldWhenAllowed(container, map.signals)
    map.creditRendered()
    vi.advanceTimersByTime(60_000)
    expect(isExpanded(control)).toBe(true)

    setTabVisible(true)
    vi.advanceTimersByTime(5000)
    expect(isExpanded(control)).toBe(false)
  })

  it('folds at once when the user moves the map', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.userMove()
    expect(isExpanded(control)).toBe(false)
  })

  it('never folds again a credit the user reopened with (i)', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.creditRendered()
    vi.advanceTimersByTime(1000)
    map.userMove()
    reopen(control)

    vi.advanceTimersByTime(60_000)
    map.creditRendered()
    map.userMove()
    setTabVisible(true)
    vi.advanceTimersByTime(60_000)
    expect(isExpanded(control)).toBe(true)
  })

  it('does nothing after cleanup, whatever the map still emits', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    const stop = foldWhenAllowed(container, map.signals)
    map.creditRendered()
    stop()

    vi.advanceTimersByTime(60_000)
    map.creditRendered()
    map.userMove()
    setTabVisible(true)
    vi.advanceTimersByTime(60_000)
    expect(isExpanded(control)).toBe(true)
  })
})

describe('addAttribution', () => {
  function mount() {
    recorded.controlOptions.length = 0
    for (const type of Object.keys(recorded.handlers)) delete recorded.handlers[type]
    const map = new maplibregl.Map({ container: document.createElement('div') })
    addAttribution(map)
    const control = renderControl(map.getContainer(), EXPANDED)
    const emit = (type: string, event: { originalEvent?: Event } = {}) =>
      (recorded.handlers[type] ?? []).forEach((handler) => handler(event))
    return { control, emit }
  }

  it('adds a compact control, open on load', () => {
    const { control } = mount()
    expect(recorded.controlOptions).toEqual([{ compact: true }])
    expect(isExpanded(control)).toBe(true)
  })

  it('starts the five seconds when tile metadata renders the credit, not on load', () => {
    const { control, emit } = mount()
    emit('load')
    vi.advanceTimersByTime(60_000)
    expect(isExpanded(control)).toBe(true)

    emit('sourcedata')
    vi.advanceTimersByTime(5000)
    expect(isExpanded(control)).toBe(false)
  })

  it('folds on a user move but not on a programmatic one', () => {
    const { control, emit } = mount()
    emit('movestart')
    expect(isExpanded(control)).toBe(true)
    emit('movestart', { originalEvent: new Event('touchstart') })
    expect(isExpanded(control)).toBe(false)
  })

  it('folds on a single wheel notch, which MapLibre reports without an original event', () => {
    const { control, emit } = mount()
    emit('wheel')
    expect(isExpanded(control)).toBe(false)
  })
})
