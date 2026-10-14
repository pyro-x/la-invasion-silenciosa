import '@testing-library/jest-dom/vitest'
import { resetMapSessionForTests } from '@/lib/mapSession'

// What the map keeps between visits lives in a module (LCHP-56): every test
// starts as an app that has just been opened.
beforeEach(resetMapSessionForTests)

// maplibre-gl needs WebGL, absent in happy-dom. Stub it so components that
// mount a map (BarrioMap) don't crash when a test renders /mapa without
// mocking the map itself; tests that assert map behavior mock BarrioMap.
vi.mock('maplibre-gl', () => {
  class Map {
    on() {}
    addControl() {}
    getContainer() {
      return document.createElement('div')
    }
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
