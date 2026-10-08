// Map data credit (LCHP-33, D-059). OpenStreetMap and OpenMapTiles must be
// credited in a corner of the map; the OSM Foundation guidelines allow the
// credit to fold on map interaction or after five seconds as long as it
// stays reachable — MapLibre's compact control leaves an (i) button. It is
// never folded on load. The basemap style's own credit lives at
// /perfil/creditos.
import maplibregl from 'maplibre-gl'

export const FOLD_AFTER_MS = 5000

function control(mapContainer: HTMLElement) {
  return mapContainer.querySelector('.maplibregl-ctrl-attrib')
}

export function foldAttribution(mapContainer: HTMLElement) {
  control(mapContainer)?.classList.remove('maplibregl-compact-show')
}

type MapSignals = {
  /** Fires whenever the credit may have been (re)rendered. */
  onCreditRendered: (listener: () => void) => void
  /** Fires when the user — not the app — starts moving the map. */
  onUserMove: (listener: () => void) => void
}

/**
 * Folds the credit once: after five uninterrupted seconds of it being on
 * screen in a visible tab, or on the first user move. The credit text
 * arrives with the tile metadata, which can be slow, so the clock waits for
 * it; hiding the tab resets the clock. After that one fold the credit is
 * the user's: reopening it with (i) is never undone from here.
 */
export function foldWhenAllowed(mapContainer: HTMLElement, signals: MapSignals): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let settled = false

  const settle = () => {
    settled = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', syncClock)
  }
  const fold = () => {
    if (settled) return
    settle()
    foldAttribution(mapContainer)
  }
  function syncClock() {
    if (settled) return
    if (document.visibilityState !== 'visible') {
      clearTimeout(timer)
      timer = undefined
      return
    }
    if (timer !== undefined) return
    if (!control(mapContainer)?.classList.contains('maplibregl-compact-show')) return
    timer = setTimeout(fold, FOLD_AFTER_MS)
  }

  signals.onCreditRendered(syncClock)
  signals.onUserMove(fold)
  document.addEventListener('visibilitychange', syncClock)
  return settle
}

/** Adds the attribution control; returns the cleanup for the fold. */
export function addAttribution(map: maplibregl.Map): () => void {
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  return foldWhenAllowed(map.getContainer(), {
    onCreditRendered: (listener) => {
      map.on('sourcedata', listener)
    },
    // MapLibre folds on drag only; pinch, wheel and double-tap count too.
    // Programmatic moves (a GPS recenter) carry no originalEvent — and
    // neither does a single wheel notch, hence the separate wheel listener.
    onUserMove: (listener) => {
      map.on('movestart', (event) => {
        if (event.originalEvent) listener()
      })
      map.on('wheel', listener)
    },
  })
}
