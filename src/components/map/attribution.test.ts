import { FOLD_AFTER_MS, foldAttribution, foldWhenAllowed } from './attribution'

const EXPANDED = 'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show'
// What MapLibre renders before the tile metadata (and its credit) arrives.
const EMPTY = 'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-attrib-empty'

function mapContainerWithControl(classes: string): { container: HTMLElement; control: Element } {
  const container = document.createElement('div')
  container.innerHTML = `<details class="${classes}" open><summary></summary><div>© OpenMapTiles</div></details>`
  const control = container.firstElementChild
  if (!control) throw new Error('control not rendered')
  return { container, control }
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
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps the credit open for five full seconds, then folds it', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.creditRendered()

    vi.advanceTimersByTime(FOLD_AFTER_MS - 1)
    expect(isExpanded(control)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isExpanded(control)).toBe(false)
  })

  it('starts the clock only once the credit is on screen (slow tile metadata)', () => {
    const { container, control } = mapContainerWithControl(EMPTY)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)

    map.creditRendered()
    vi.advanceTimersByTime(FOLD_AFTER_MS * 2)
    control.className = EXPANDED
    expect(isExpanded(control)).toBe(true)

    map.creditRendered()
    vi.advanceTimersByTime(FOLD_AFTER_MS - 1)
    expect(isExpanded(control)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isExpanded(control)).toBe(false)
  })

  it('does not restart the clock on later tile loads', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.creditRendered()
    vi.advanceTimersByTime(FOLD_AFTER_MS - 1000)
    map.creditRendered()
    vi.advanceTimersByTime(1000)
    expect(isExpanded(control)).toBe(false)
  })

  it('folds at once when the user moves the map', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    foldWhenAllowed(container, map.signals)
    map.userMove()
    expect(isExpanded(control)).toBe(false)
  })

  it('leaves the credit alone after cleanup', () => {
    const { container, control } = mapContainerWithControl(EXPANDED)
    const map = fakeSignals()
    const stop = foldWhenAllowed(container, map.signals)
    map.creditRendered()
    stop()
    vi.advanceTimersByTime(FOLD_AFTER_MS * 2)
    expect(isExpanded(control)).toBe(true)
  })
})
