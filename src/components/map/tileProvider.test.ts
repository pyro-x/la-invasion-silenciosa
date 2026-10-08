import type { LayerSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import { buildMapStyle, tileProvider } from './tileProvider'

function layersOf(style: StyleSpecification | string): LayerSpecification[] {
  if (typeof style === 'string') throw new Error('expected an inline style')
  return style.layers
}

describe('tileProvider', () => {
  const style = buildMapStyle(tileProvider)

  it('ships the vendored vector style, not a provider URL', () => {
    expect(tileProvider.kind).toBe('vector')
    expect(typeof style).toBe('object')
  })

  it('reads tiles from OpenFreeMap only — no key, no other host', () => {
    if (typeof style === 'string') throw new Error('expected an inline style')
    const sources = Object.values(style.sources)
    expect(sources).toHaveLength(1)
    const [source] = sources
    expect(source.type).toBe('vector')
    expect(source.type === 'vector' && source.url).toBe('https://tiles.openfreemap.org/planet')
    expect(JSON.stringify(style)).not.toMatch(/key=|token=|openstreetmap\.org\/\{z\}/)
  })

  // Golden rule (D-046): the public map shows approximate locations, so the
  // basemap must not label doors or venues that would pin a sighting down.
  it('draws no house numbers and no points of interest', () => {
    const sourceLayers = layersOf(style).map((l) => ('source-layer' in l ? l['source-layer'] : ''))
    expect(sourceLayers).not.toContain('housenumber')
    expect(sourceLayers).not.toContain('poi')
  })

  it('labels every named feature in Spanish first', () => {
    const named = layersOf(style).filter(
      (l): l is SymbolLayerSpecification => l.type === 'symbol' && !!l.layout?.['text-field'],
    )
    expect(named.length).toBeGreaterThan(5)
    for (const l of named) {
      expect(JSON.stringify(l.layout?.['text-field'])).toContain('"name:es"')
    }
  })

  it('needs no sprite sheet', () => {
    if (typeof style === 'string') throw new Error('expected an inline style')
    expect(style.sprite).toBeUndefined()
    for (const l of layersOf(style)) {
      expect(l.layout && 'icon-image' in l.layout).toBeFalsy()
    }
  })

  it('still builds an inline raster style for a raster provider', () => {
    const raster = buildMapStyle({
      id: 'osm-raster',
      kind: 'raster',
      tiles: ['https://example.test/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'test',
    })
    expect(layersOf(raster)[0]?.type).toBe('raster')
  })
})
