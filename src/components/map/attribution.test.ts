import { foldAttribution } from './attribution'

function mapContainerWithControl(classes: string): { container: HTMLElement; control: Element } {
  const container = document.createElement('div')
  container.innerHTML = `<details class="${classes}" open><summary></summary><div>© OpenMapTiles</div></details>`
  const control = container.firstElementChild
  if (!control) throw new Error('control not rendered')
  return { container, control }
}

describe('foldAttribution', () => {
  it('minimises the expanded compact control and keeps the (i) button', () => {
    const { container, control } = mapContainerWithControl(
      'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show',
    )
    foldAttribution(container)
    expect(control.classList.contains('maplibregl-compact-show')).toBe(false)
    expect(control.classList.contains('maplibregl-compact')).toBe(true)
    expect(container.contains(control)).toBe(true)
  })

  it('is a no-op when the map has no attribution control yet', () => {
    expect(() => foldAttribution(document.createElement('div'))).not.toThrow()
  })
})
