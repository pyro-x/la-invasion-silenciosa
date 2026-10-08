// Map data credit (LCHP-33, D-059). OpenStreetMap and OpenMapTiles must be
// credited in a corner of the map; the OSM Foundation guidelines allow the
// credit to fold on map interaction or after five seconds as long as it
// stays reachable — MapLibre's compact control leaves an (i) button. It is
// never folded on load. The basemap style's own credit lives at /creditos.
import maplibregl from 'maplibre-gl'
import type { TileProviderConfig } from './tileProvider'

const FOLD_AFTER_MS = 5000

export function foldAttribution(mapContainer: HTMLElement) {
  mapContainer.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
}

/** Adds the attribution control; returns the cleanup for the fold timer. */
export function addAttribution(map: maplibregl.Map, provider: TileProviderConfig): () => void {
  map.addControl(
    new maplibregl.AttributionControl({ compact: provider.compactAttribution }),
    'bottom-right',
  )
  if (!provider.compactAttribution) return () => {}

  const fold = () => foldAttribution(map.getContainer())
  const timer = setTimeout(fold, FOLD_AFTER_MS)
  // MapLibre folds on drag only; pinch and double-tap zoom count too.
  // Programmatic moves (a GPS recenter) carry no originalEvent.
  map.on('movestart', (event) => {
    if (event.originalEvent) fold()
  })
  return () => clearTimeout(timer)
}
