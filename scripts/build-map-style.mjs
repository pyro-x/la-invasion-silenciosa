// Regenerates src/components/map/styles/chispera.ts from the committed
// snapshot of OpenFreeMap's positron style (scripts/positron.snapshot.json)
// and one of the palettes below (LCHP-33, D-059).
//   node scripts/build-map-style.mjs [palette] [--refresh]
// --refresh re-downloads the snapshot first; review its diff before
// committing. Then `pnpm format`.
import { readFileSync, writeFileSync } from 'node:fs'

const UPSTREAM = 'https://tiles.openfreemap.org/styles/positron'
const SNAPSHOT = new URL('./positron.snapshot.json', import.meta.url)
const OUT = new URL('../src/components/map/styles/chispera.ts', import.meta.url)

const PALETTES = {
  pergamino: {
    background: '#f3e9d6',
    residential: '#efe3cc',
    building: '#e6d7bc',
    buildingOutline: '#d6c3a2',
    park: '#dcdfb4',
    wood: '#d4d9b0',
    water: '#cfdbe3',
    waterway: '#c3d2dc',
    roadMinor: '#fffaf0',
    roadMajor: '#fff7e6',
    roadCasing: '#dcc9a6',
    path: '#e9dcc3',
    rail: '#d6c3a2',
    text: '#5b4634',
    textHalo: '#fbf4e6',
    place: '#2a1410',
    waterText: '#4f6b85',
    boundary: '#c9b48f',
  },
  papel: {
    background: '#f8f1e4',
    residential: '#f4ebda',
    building: '#ece0c8',
    buildingOutline: '#ddccaf',
    park: '#e3e6c4',
    wood: '#dde2bf',
    water: '#d6e0e6',
    waterway: '#cad8e0',
    roadMinor: '#ffffff',
    roadMajor: '#fffdf8',
    roadCasing: '#e3d5b8',
    path: '#f0e6d2',
    rail: '#ddccaf',
    text: '#6b5547',
    textHalo: '#fffdf8',
    place: '#2a1410',
    waterText: '#5a7590',
    boundary: '#d3c2a3',
  },
  tierra: {
    background: '#ecdfc8',
    residential: '#e6d7bc',
    building: '#dcc9a6',
    buildingOutline: '#c9b48f',
    park: '#d3d6a6',
    wood: '#cad09e',
    water: '#c8d4dc',
    waterway: '#bccbd5',
    roadMinor: '#faf2e2',
    roadMajor: '#fff7e6',
    roadCasing: '#cdb891',
    path: '#e0d2b4',
    rail: '#c9b48f',
    text: '#4a3528',
    textHalo: '#f7ecd7',
    place: '#2a1410',
    waterText: '#48627a',
    boundary: '#b9a27c',
  },
  verde: {
    background: '#f3e9d6',
    residential: '#efe3cc',
    building: '#e8dcc4',
    buildingOutline: '#d6c3a2',
    park: '#cfe0b8',
    wood: '#c4d8ab',
    water: '#c5d6df',
    waterway: '#b8cbd7',
    roadMinor: '#fffaf0',
    roadMajor: '#fff3dd',
    roadCasing: '#dcc9a6',
    path: '#e9dcc3',
    rail: '#d6c3a2',
    text: '#5b4634',
    textHalo: '#fbf4e6',
    place: '#105016',
    waterText: '#4f6b85',
    boundary: '#c9b48f',
  },
}

// Shields and the airport label need positron's sprite sheet and label
// features La Latina does not have. ne2_shaded is a relief raster for
// z<6, unreachable inside maxBounds.
const DROP = new Set([
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
  'airport',
])

const SPANISH = ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]

// Layers outside this map (aeroway, glacier, ice shelf) keep positron's
// colours: nothing inside maxBounds draws them.
function colours(P) {
  return {
    background: { 'background-color': P.background },
    park: { 'fill-color': P.park },
    water: { 'fill-color': P.water },
    landuse_residential: { 'fill-color': P.residential },
    landcover_wood: { 'fill-color': P.wood },
    waterway: { 'line-color': P.waterway },
    building: { 'fill-color': P.building, 'fill-outline-color': P.buildingOutline },
    tunnel_motorway_casing: { 'line-color': P.roadCasing },
    tunnel_motorway_inner: { 'line-color': P.roadMajor },
    road_area_pier: { 'fill-color': P.background },
    road_pier: { 'line-color': P.background },
    highway_path: { 'line-color': P.path },
    highway_minor: { 'line-color': P.roadMinor },
    highway_major_casing: { 'line-color': P.roadCasing },
    highway_major_inner: { 'line-color': P.roadMajor },
    highway_major_subtle: { 'line-color': P.roadCasing },
    highway_motorway_casing: { 'line-color': P.roadCasing },
    highway_motorway_inner: { 'line-color': P.roadMajor },
    highway_motorway_subtle: { 'line-color': P.roadCasing },
    highway_motorway_bridge_casing: { 'line-color': P.roadCasing },
    highway_motorway_bridge_inner: { 'line-color': P.roadMajor },
    railway_transit: { 'line-color': P.rail },
    railway_transit_dashline: { 'line-color': P.roadMinor },
    railway_service: { 'line-color': P.rail },
    railway_service_dashline: { 'line-color': P.roadMinor },
    railway: { 'line-color': P.rail },
    railway_dashline: { 'line-color': P.roadMinor },
    boundary_3: { 'line-color': P.boundary },
    boundary_2: { 'line-color': P.boundary },
    boundary_disputed: { 'line-color': P.boundary },
  }
}

function buildStyle(positron, paletteName) {
  const P = PALETTES[paletteName]
  if (!P)
    throw new Error(`unknown palette ${paletteName}; one of ${Object.keys(PALETTES).join(', ')}`)
  const COLOR = colours(P)
  const layers = []
  for (const l of positron.layers) {
    if (DROP.has(l.id)) continue
    const out = { ...l }
    if (COLOR[l.id]) out.paint = { ...l.paint, ...COLOR[l.id] }
    if (l.type === 'symbol') {
      const paint = { ...l.paint }
      if ('text-color' in paint) {
        const isPlace = l['source-layer'] === 'place'
        const isWater = l['source-layer'] === 'water_name' || l['source-layer'] === 'waterway'
        paint['text-color'] = isWater ? P.waterText : isPlace ? P.place : P.text
      }
      if ('text-halo-color' in paint) paint['text-halo-color'] = P.textHalo
      out.paint = paint
      // Place labels carry a sprite dot below z10 (unreachable here) and
      // the style ships no sprite sheet.
      const layout = Object.fromEntries(
        Object.entries(l.layout ?? {}).filter(([k]) => !k.startsWith('icon-')),
      )
      if (layout['text-field']) layout['text-field'] = SPANISH
      // Named fountains and ponds were louder than street names at 14 px.
      if (l.id === 'water_name_point_label')
        layout['text-size'] = ['interpolate', ['linear'], ['zoom'], 15, 10, 18, 12]
      out.layout = layout
    }
    layers.push(out)
  }
  return {
    version: 8,
    name: `chispera-${paletteName}`,
    sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
    glyphs: positron.glyphs,
    layers,
  }
}

function header(paletteName) {
  return `// Chispera basemap style (LCHP-33, D-059). Generated by
// scripts/build-map-style.mjs from scripts/positron.snapshot.json — edit the
// script, not this file.
//
// Derived from OpenFreeMap's "positron" style
// (${UPSTREAM}; openfreemap-styles,
// MIT License, Copyright (c) 2023 Zsolt Ero — full notice in
// ./OPENFREEMAP-STYLES-LICENSE.md), a fork of openmaptiles/positron-gl-style:
//   Copyright (c) 2024, MapTiler.com & OpenMapTiles contributors.
//   Copyright (c) 2015, CartoDB Inc.
//   All rights reserved.
//   Derived from "CartoDB Basemaps" designed by Stamen and Paul Norman for
//   CartoDB Inc., licensed under CC-BY 3.0.
// Code under the BSD 3-Clause License, design under CC-BY 4.0. The complete
// licence — conditions and disclaimer included — is retained verbatim in
// ./POSITRON-LICENSE.md. Both notices are shown to users at /perfil/creditos.
//
// Changes vs positron: chispera "${paletteName}" palette on the layers this
// map can show; labels coalesce(name:es, name:latin, name); road shields,
// airport and the ne2_shaded relief source dropped (sprite / z<6);
// place-label icons dropped; quieter fountain labels; boundary_3's
// ["linear", 1] corrected. No poi and no housenumber layers by construction
// (golden rule, D-046); pinned by tileProvider.test.ts.
import type { StyleSpecification } from 'maplibre-gl'

`
}

const args = process.argv.slice(2)
const paletteName = args.find((a) => !a.startsWith('--')) ?? 'papel'

if (args.includes('--refresh')) {
  const res = await fetch(UPSTREAM, {
    headers: { 'user-agent': 'la-invasion-silenciosa/build-map-style' },
  })
  if (!res.ok) throw new Error(`${UPSTREAM} → ${res.status}`)
  writeFileSync(SNAPSHOT, await res.text())
}

// positron writes ["linear", 1] in boundary_3; MapLibre tolerates it, the
// StyleSpecification type rightly does not.
const positron = JSON.parse(readFileSync(SNAPSHOT, 'utf8').replaceAll('["linear",1]', '["linear"]'))

const style = buildStyle(positron, paletteName)
writeFileSync(
  OUT,
  `${header(paletteName)}export const chisperaStyle: StyleSpecification = ${JSON.stringify(style, null, 2)}\n`,
)
console.log(`wrote ${OUT.pathname} (${paletteName}, ${style.layers.length} layers)`)
