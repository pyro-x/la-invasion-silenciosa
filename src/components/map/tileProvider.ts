// Tile source abstraction (brief §21, validated in the LCHP-4 spike). A
// discriminated union so a raster source (inline JSON style) and a future
// vector source (a style URL passed straight to MapLibre) don't leak each
// other's orphan fields. MVP ships OSM raster — no key, no account.
import type { StyleSpecification } from 'maplibre-gl'

export type TileProviderId = 'osm-raster' | 'maptiler-vector' | 'stadia-vector' | 'custom-vector'

export type TileProviderConfig =
  | {
      id: TileProviderId
      kind: 'raster'
      tiles: string[]
      tileSize: 256
      maxzoom: number
      attribution: string
    }
  | { id: TileProviderId; kind: 'vector'; styleUrl: string }

// OSM Tile Usage Policy (brief §21): exact host, HTTPS only, no alt
// subdomains, attribution always visible, no pre-seeding. A neighborhood
// pilot's interactive viewport use fits comfortably.
export const tileProvider: TileProviderConfig = {
  id: 'osm-raster',
  kind: 'raster',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  tileSize: 256,
  maxzoom: 19,
  attribution: '© OpenStreetMap contributors',
}

// The chispera tint does NOT live here: David picked the «pergamino suave»
// variant in the visual loop (4 candidates screenshotted side by side), and
// it is applied as a CSS filter on the MapLibre canvas plus a cream multiply
// veil (see .barrio-map in globals.css and BarrioMap.tsx). Raster paint
// stays untouched so the style JSON remains provider-plumbing only.
export function buildMapStyle(provider: TileProviderConfig): StyleSpecification {
  if (provider.kind === 'vector') {
    // A vector style URL is consumed directly by `new Map({ style })`; this
    // branch exists for the post-MVP swap and is not used in the MVP.
    throw new Error('vector tile providers are post-MVP (§23)')
  }
  return {
    version: 8,
    sources: {
      [provider.id]: {
        type: 'raster',
        tiles: provider.tiles,
        tileSize: provider.tileSize,
        maxzoom: provider.maxzoom,
        attribution: provider.attribution,
      },
    },
    layers: [
      {
        id: provider.id,
        type: 'raster',
        source: provider.id,
      },
    ],
  }
}

// The real La Latina frame verified by the spike (brief §21). Used as the
// map's initial bounds and maxBounds.
export const LA_LATINA_BOUNDS: [[number, number], [number, number]] = [
  [-3.7173, 40.4093],
  [-3.7068, 40.4138],
]
