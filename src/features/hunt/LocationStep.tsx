// Real location step (LCHP-14): the position is always the picker map's
// center (fixed center pin, D-051). «Usar mi ubicación» fires the native
// geolocation prompt ON TAP (never on load — LCHP-5 decision); denial or
// absence degrade to the manual pin, never a dead end. The exact coordinate
// goes to the server untouched (D-049); the public one is snapped there.
import { lazy, Suspense, useRef, useState } from 'react'
import { getGeoFix, isWithinLaLatina } from '@/lib/geo'
import type { CapturePosition } from './captureFlow'

const LocationPickerMap = lazy(() =>
  import('@/components/map/LocationPickerMap').then((m) => ({ default: m.LocationPickerMap })),
)

type Props = {
  position: CapturePosition | null
  approxOnly: boolean
  onPositionChanged: (position: CapturePosition) => void
  onApproxToggled: () => void
  onNext: () => void
}

type GeoState = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable'

const GEO_MESSAGES: Partial<Record<GeoState, string>> = {
  denied:
    'Sin permiso de ubicación. Actívala en Ajustes → Safari (o en el candado del navegador) — o coloca el pin a mano arrastrando el mapa.',
  unavailable: 'No se pudo obtener tu posición. Coloca el pin a mano arrastrando el mapa.',
}

export function LocationStep({
  position,
  approxOnly,
  onPositionChanged,
  onApproxToggled,
  onNext,
}: Props) {
  const [geo, setGeo] = useState<GeoState>('idle')
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)
  // Accuracy of a GPS fix in flight: consumed by the programmatic moveend it
  // triggers, so the settled center is tagged as a GPS position.
  const pendingGpsAccuracy = useRef<number | null>(null)

  async function locate() {
    setGeo('locating')
    const fix = await getGeoFix()
    if (fix.kind !== 'ok') {
      setGeo(fix.kind)
      return
    }
    setGeo('granted')
    pendingGpsAccuracy.current = fix.accuracyM
    setFlyTo({ lat: fix.lat, lng: fix.lng })
  }

  function onCenterChanged(center: { lat: number; lng: number }, byUser: boolean) {
    if (!byUser && pendingGpsAccuracy.current !== null) {
      const accuracyM = pendingGpsAccuracy.current
      pendingGpsAccuracy.current = null
      onPositionChanged({ ...center, accuracyM, source: 'gps' })
      return
    }
    onPositionChanged({ ...center, accuracyM: null, source: 'manual' })
  }

  const outOfBounds = position !== null && !isWithinLaLatina(position.lat, position.lng)
  const canContinue = position !== null && !outOfBounds
  const geoMessage = GEO_MESSAGES[geo]

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
        <Suspense
          fallback={
            <div className="panel center" style={{ position: 'absolute', inset: 0 }}>
              cargando mapa…
            </div>
          }
        >
          <LocationPickerMap flyTo={flyTo} onCenterChanged={onCenterChanged} />
        </Suspense>
      </div>

      <button
        className="btn btn-accent"
        onClick={() => void locate()}
        disabled={geo === 'locating'}
      >
        {geo === 'locating' ? 'Localizando…' : '📡 Usar mi ubicación'}
      </button>

      {geoMessage && (
        <div className="panel pad" style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-dim)' }}>
          {geoMessage}
        </div>
      )}

      <div className="panel pad" style={{ padding: 14 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 4 }}>
          UBICACIÓN DEL AVISTAMIENTO
        </div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          {outOfBounds
            ? 'El pin está fuera de La Latina'
            : position
              ? position.source === 'gps'
                ? `Tu posición${position.accuracyM !== null ? ` · ±${Math.round(position.accuracyM)} m` : ''}`
                : 'Pin colocado a mano'
              : 'Arrastra el mapa para colocar el pin'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>
          Arrastra el mapa hasta dejar el pin sobre la criatura.
        </div>
      </div>

      <button
        className="panel pad"
        onClick={onApproxToggled}
        style={{
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
      >
        <div
          style={{
            width: 44,
            height: 26,
            borderRadius: 999,
            background: approxOnly ? 'var(--good)' : 'var(--line)',
            border: 'var(--bw) solid var(--line)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: approxOnly ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .15s',
            }}
          />
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
          Por privacidad, guardamos solo una ubicación aproximada.
        </span>
      </button>

      <button
        className="btn btn-cta"
        disabled={!canContinue}
        style={{ opacity: canContinue ? 1 : 0.45 }}
        onClick={onNext}
      >
        ▸ Revisa y envía
      </button>
    </div>
  )
}
