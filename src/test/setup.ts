import '@testing-library/jest-dom/vitest'

// maplibre-gl needs WebGL, absent in happy-dom. Stub it so components that
// mount a map (BarrioMap) don't crash when a test renders /mapa without
// mocking the map itself; tests that assert map behavior mock BarrioMap.
vi.mock('maplibre-gl', () => {
  class Map {
    on() {}
    addControl() {}
    remove() {}
  }
  class Marker {
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    remove() {}
  }
  class AttributionControl {}
  return { default: { Map, Marker, AttributionControl } }
})
