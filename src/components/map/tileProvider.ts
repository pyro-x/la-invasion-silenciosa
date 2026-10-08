// Tile source abstraction (brief §21). A discriminated union so a raster
// source (inline JSON style) and a vector source (a full style, or a style
// URL passed straight to MapLibre) don't leak each other's orphan fields.
// MVP ships OpenFreeMap vector tiles with the vendored chispera style
// (LCHP-33, D-059) — no key, no account.
import type { StyleSpecification } from 'maplibre-gl'
import { chisperaStyle } from './styles/chispera'

export type TileProviderId = 'openfreemap-vector' | 'osm-raster'

export type TileProviderConfig =
  | {
      id: TileProviderId
      kind: 'raster'
      tiles: string[]
      tileSize: 256
      maxzoom: number
      attribution: string
    }
  | { id: TileProviderId; kind: 'vector'; style: StyleSpecification | string }

// OpenFreeMap terms (https://openfreemap.org/tos/, read 2026-10-08): no
// registration, no API key, no stated request limits, commercial use allowed,
// attribution required (OpenStreetMap + OpenMapTiles), automated bulk
// collection forbidden, service provided as-is and may be discontinued without
// notice. No SLA — the public instance is donation-funded.
// TODO(post-mvp): if the public instance disappears, OpenFreeMap's server
// setup is open source but publishes full-planet dumps only; the fallback is
// cutting a La Latina extract ourselves (planetiler/Geofabrik) and serving
// z/x/y from R2/Pages (brief §22, option C), or OSM_RASTER_FALLBACK meanwhile.
export const tileProvider: TileProviderConfig = {
  id: 'openfreemap-vector',
  kind: 'vector',
  style: chisperaStyle,
}

// The MVP's original basemap (brief §21, LCHP-4/LCHP-13), kept as the
// emergency fallback. Using it again means honouring the OSM Tile Usage
// Policy: attribution must stay visible (no compact control) and tiles must
// never be precached.
export const OSM_RASTER_FALLBACK: TileProviderConfig = {
  id: 'osm-raster',
  kind: 'raster',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  tileSize: 256,
  maxzoom: 19,
  attribution: '© OpenStreetMap contributors',
}

export function buildMapStyle(provider: TileProviderConfig): StyleSpecification | string {
  if (provider.kind === 'vector') return provider.style
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

// The real La Latina frame verified by the spike (brief §21). The map OPENS
// framed to this (initial `bounds`).
export const LA_LATINA_BOUNDS: [[number, number], [number, number]] = [
  [-3.7173, 40.4093],
  [-3.7068, 40.4138],
]

// Pan limit: the frame plus ~1.5 km of margin (≈0.0177° lng, 0.0135° lat at
// 40.4°N). Lets the map breathe and reach the surrounding streets without
// wandering off to another part of the city — it's a barrio game (brief §21).
export const LA_LATINA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-3.735, 40.3958],
  [-3.6891, 40.4273],
]
