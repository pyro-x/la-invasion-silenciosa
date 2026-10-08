// The basemap provider (brief §21): the one place that names it. MVP ships
// OpenFreeMap vector tiles with the vendored chispera style (LCHP-33, D-059)
// — no key, no account. A style is either an inline spec or a URL; MapLibre
// takes both.
import type { StyleSpecification } from 'maplibre-gl'
import { chisperaStyle } from './styles/chispera'

export type TileProvider = {
  id: 'openfreemap-vector'
  style: StyleSpecification | string
}

// OpenFreeMap terms (https://openfreemap.org/tos/, read 2026-10-08): no
// registration, no API key, no stated request limits, commercial use allowed,
// attribution required (OpenStreetMap + OpenMapTiles), automated bulk
// collection forbidden, service provided as-is and may be discontinued without
// notice. No SLA — the public instance is donation-funded.
// TODO(post-mvp): if the public instance disappears, OpenFreeMap's server
// setup is open source but publishes full-planet dumps only; the way out is
// cutting a La Latina extract ourselves (planetiler/Geofabrik) and serving
// z/x/y from R2/Pages (brief §22, option C).
export const tileProvider: TileProvider = {
  id: 'openfreemap-vector',
  style: chisperaStyle,
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
