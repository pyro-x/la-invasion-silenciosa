// Center-pin location picker (LCHP-14): the pin is fixed at the viewport
// center and the user drags the map underneath (chosen over tap-to-place —
// finger-precise on small screens). The submitted position is ALWAYS the map
// center; `initialCenter` opens the map on the neighbour's position (LCHP-54:
// the watch already has it when the step opens) and `flyTo` recenters
// programmatically without counting as a user move.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { addAttribution } from './attribution'
import { LA_LATINA_BOUNDS, LA_LATINA_MAX_BOUNDS, tileProvider } from './tileProvider'

// Street level: the 50 m radius a pin may be nudged in fills the picker.
const PICK_ZOOM = 17

type Props = {
  /** Where the map opens, read once at mount; the barrio frame otherwise. */
  initialCenter?: { lat: number; lng: number } | null
  /** Programmatic recenter (a GPS fix). Same object identity = no move. */
  flyTo: { lat: number; lng: number } | null
  /** Fires on every settle with the new center; byUser=false for `flyTo`. */
  onCenterChanged: (center: { lat: number; lng: number }, byUser: boolean) => void
}

export function LocationPickerMap({ initialCenter = null, flyTo, onCenterChanged }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onCenterChangedRef = useRef(onCenterChanged)
  const movedByCode = useRef(false)
  const opensAt = useRef(initialCenter)

  useEffect(() => {
    onCenterChangedRef.current = onCenterChanged
  })

  useEffect(() => {
    if (!containerRef.current) return
    const at = opensAt.current
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: tileProvider.style,
      ...(at
        ? { center: [at.lng, at.lat], zoom: PICK_ZOOM }
        : { bounds: LA_LATINA_BOUNDS, fitBoundsOptions: { padding: 16 } }),
      maxBounds: LA_LATINA_MAX_BOUNDS,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })
    const stopAttributionFold = addAttribution(map)
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
      stopAttributionFold()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyTo) return
    movedByCode.current = true
    map.easeTo({ center: [flyTo.lng, flyTo.lat], zoom: PICK_ZOOM, duration: 600 })
  }, [flyTo])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
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
