import type { LayerSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import { tileProvider } from './tileProvider'

function inlineStyle(style: StyleSpecification | string): StyleSpecification {
  if (typeof style === 'string') throw new Error('expected an inline style')
  return style
}

function layersOf(style: StyleSpecification | string): LayerSpecification[] {
  return inlineStyle(style).layers
}

// Every OpenMapTiles layer the basemap may draw. Anything else — poi,
// housenumber, mountain_peak, aerodrome_label… — labels a door, a venue or
// a landmark precise enough to pin a sighting down (golden rule, D-046).
const ALLOWED_SOURCE_LAYERS = [
  'park',
  'water',
  'landcover',
  'landuse',
  'waterway',
  'building',
  'transportation',
  'aeroway',
  'boundary',
  'water_name',
  'transportation_name',
  'place',
]

// Text may only come from these: streets, water, and place names. A label
// on `building`, `park` (heritage sites and protected buildings in
// OpenMapTiles) or `landuse` would name a venue.
const LABEL_SOURCE_LAYERS = ['water_name', 'waterway', 'transportation_name', 'place']

const SPANISH_FIRST = ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]

describe('tileProvider', () => {
  const style = tileProvider.style

  it('ships the vendored vector style, not a provider URL', () => {
    expect(typeof style).toBe('object')
  })

  it('reads tiles from OpenFreeMap only — no key, no other host', () => {
    const sources = Object.values(inlineStyle(style).sources)
    expect(sources).toHaveLength(1)
    const [source] = sources
    expect(source.type).toBe('vector')
    expect(source.type === 'vector' && source.url).toBe('https://tiles.openfreemap.org/planet')
    expect(JSON.stringify(style)).not.toMatch(/key=|token=|openstreetmap\.org\/\{z\}/)
  })

  it('draws only public-space layers: no house numbers, no points of interest', () => {
    for (const l of layersOf(style)) {
      if (l.type === 'background') continue
      expect(l, l.id).toHaveProperty('source-layer')
      expect(
        ALLOWED_SOURCE_LAYERS,
        `${l.id} → ${'source-layer' in l && l['source-layer']}`,
      ).toContain('source-layer' in l ? l['source-layer'] : '')
    }
  })

  it('labels every named feature with exactly the Spanish-first expression', () => {
    const named = layersOf(style).filter(
      (l): l is SymbolLayerSpecification => l.type === 'symbol' && !!l.layout?.['text-field'],
    )
    expect(named.length).toBeGreaterThan(5)
    for (const l of named) {
      expect(l.layout?.['text-field'], l.id).toEqual(SPANISH_FIRST)
    }
  })

  it('puts text only on street, water and place-name layers', () => {
    const symbols = layersOf(style).filter((l) => l.type === 'symbol')
    expect(symbols.length).toBeGreaterThan(5)
    for (const l of symbols) {
      expect(LABEL_SOURCE_LAYERS, l.id).toContain(l['source-layer'])
    }
  })

  it('needs no sprite sheet', () => {
    expect(inlineStyle(style).sprite).toBeUndefined()
    for (const l of layersOf(style)) {
      expect(l.layout && 'icon-image' in l.layout, l.id).toBeFalsy()
    }
  })
})
