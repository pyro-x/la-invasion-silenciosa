// Center-pin location picker (LCHP-14): the pin is fixed at the viewport
// center and the user drags the map underneath (chosen over tap-to-place —
// finger-precise on small screens). The submitted position is ALWAYS the map
// center; `flyTo` recenters programmatically (GPS fix) without counting as a
// user move.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildMapStyle, LA_LATINA_BOUNDS, LA_LATINA_MAX_BOUNDS, tileProvider } from './tileProvider'

type Props = {
  /** Programmatic recenter (a GPS fix). Same object identity = no move. */
  flyTo: { lat: number; lng: number } | null
  /** Fires on every settle with the new center; byUser=false for `flyTo`. */
  onCenterChanged: (center: { lat: number; lng: number }, byUser: boolean) => void
}

export function LocationPickerMap({ flyTo, onCenterChanged }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onCenterChangedRef = useRef(onCenterChanged)
  const movedByCode = useRef(false)

  useEffect(() => {
    onCenterChangedRef.current = onCenterChanged
  })

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(tileProvider),
      bounds: LA_LATINA_BOUNDS,
      maxBounds: LA_LATINA_MAX_BOUNDS,
      fitBoundsOptions: { padding: 16 },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })
    // OSM policy: attribution always visible, non-compact.
    map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right')
    map.on('moveend', () => {
      const byUser = !movedByCode.current
      movedByCode.current = false
      const center = map.getCenter()
      onCenterChangedRef.current({ lat: center.lat, lng: center.lng }, byUser)
    })
    // Report the initial frame's center so the flow always has a position.
    map.on('load', () => {
      const center = map.getCenter()
      onCenterChangedRef.current({ lat: center.lat, lng: center.lng }, false)
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyTo) return
    movedByCode.current = true
    map.easeTo({ center: [flyTo.lng, flyTo.lat], zoom: 17, duration: 600 })
  }, [flyTo])

  return (
    <div className="barrio-map" style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Cream multiply veil — same «pergamino suave» tint as BarrioMap
          (D-045); the other half is the canvas CSS filter in globals.css. */}
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
      {/* The fixed center pin: tip anchored to the exact viewport center. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -100%)',
          fontSize: 30,
          lineHeight: 1,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))',
        }}
      >
        📍
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
