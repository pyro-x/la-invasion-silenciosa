// Real map (LCHP-13): MapLibre GL + OSM raster tinted toward the chispera
// palette, bounded to La Latina (brief §21). Sighting markers are rendered
// as React sprites via portals into MapLibre marker elements — the map owns
// positioning, React owns the pixels. No photos are loaded here (evidence is
// on demand, brief §18).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, LA_LATINA_BOUNDS, tileProvider } from './tileProvider'
import type { MapSightingGeo } from '@/types/sighting'

type Props = {
  sightings: MapSightingGeo[]
  selectedId: string | null
  onPick: (id: string) => void
  renderMarker: (s: MapSightingGeo, selected: boolean) => ReactNode
}

export function BarrioMap({ sightings, selectedId, onPick, renderMarker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerObjs = useRef(new Map<string, maplibregl.Marker>())
  const onPickRef = useRef(onPick)
  const [ready, setReady] = useState(false)
  // The marker DOM elements live in state so the portal render reads render
  // data, not a ref (react-hooks/refs).
  const [markerEls, setMarkerEls] = useState<{ id: string; el: HTMLElement }[]>([])

  useEffect(() => {
    onPickRef.current = onPick
  })

  useEffect(() => {
    if (!containerRef.current) return
    const objs = markerObjs.current
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(tileProvider),
      bounds: LA_LATINA_BOUNDS,
      maxBounds: LA_LATINA_BOUNDS,
      fitBoundsOptions: { padding: 16 },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })
    // OSM policy: attribution always visible, non-compact.
    map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right')
    mapRef.current = map
    map.on('load', () => setReady(true))
    return () => {
      map.remove()
      mapRef.current = null
      objs.clear()
    }
  }, [])

  // Reconcile MapLibre markers with the current sightings.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const objs = markerObjs.current
    const seen = new Set<string>()
    const els: { id: string; el: HTMLElement }[] = []
    for (const s of sightings) {
      seen.add(s.id)
      let marker = objs.get(s.id)
      if (marker) {
        marker.setLngLat([s.lng, s.lat])
      } else {
        const el = document.createElement('div')
        el.style.cursor = 'pointer'
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onPickRef.current(s.id)
        })
        marker = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map)
        objs.set(s.id, marker)
      }
      els.push({ id: s.id, el: marker.getElement() })
    }
    for (const [id, marker] of objs) {
      if (!seen.has(id)) {
        marker.remove()
        objs.delete(id)
      }
    }
    setMarkerEls(els)
  }, [sightings, ready])

  const byId = new Map(sightings.map((s) => [s.id, s]))

  return (
    <div className="barrio-map" style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Cream multiply veil — half of the «pergamino suave» tint David
          picked in the visual loop; the other half is the canvas CSS filter
          in globals.css (.barrio-map .maplibregl-canvas). */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg)',
          mixBlendMode: 'multiply',
          opacity: 0.22,
          pointerEvents: 'none',
        }}
      />
      {markerEls.map(({ id, el }) => {
        const s = byId.get(id)
        return s ? createPortal(renderMarker(s, id === selectedId), el) : null
      })}
    </div>
  )
}
