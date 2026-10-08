// Tile source abstraction (brief §21). A discriminated union so a raster
// source (inline JSON style) and a vector source (a full style, or a style
// URL passed straight to MapLibre) don't leak each other's orphan fields.
// MVP ships OpenFreeMap vector tiles with the vendored chispera style
// (LCHP-33) — no key, no account.
import type { StyleSpecification } from 'maplibre-gl'
import { chisperaStyle } from './styles/chispera'

export type TileProviderId = 'openfreemap-vector' | 'osm-raster' | 'custom-vector'

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

// OpenFreeMap terms (verified 2026-10-08): no registration, no API key, no
// stated request limits, attribution required (OpenStreetMap + OpenMapTiles).
// No SLA — the public instance is donation-funded.
// TODO(post-mvp): if the public instance ever disappears, OpenFreeMap's server
// setup is open source and publishes weekly planet extracts; a La Latina-sized
// extract served from R2/Pages is the fallback (brief §22, option C).
export const tileProvider: TileProviderConfig = {
  id: 'openfreemap-vector',
  kind: 'vector',
  style: chisperaStyle,
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
