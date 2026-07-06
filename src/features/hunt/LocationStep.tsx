// Real location step (LCHP-14/LCHP-28): the position is always the picker
// map's center (fixed center pin, D-051). The gate may hand over a cached GPS
// fix so the map opens pre-centered without re-prompting; «Usar mi ubicación»
// fires the native prompt ON TAP for anyone who skipped it. Denial or absence
// degrade to the manual pin, never a dead end — with per-platform recovery
// guidance (the old copy sent iOS users to a settings page with no location
// entry). The exact coordinate goes to the server untouched (D-049).
import { lazy, Suspense, useRef, useState } from 'react'
import { getGeoFix, isWithinLaLatina, type GeoFix } from '@/lib/geo'
import { locationDenialGuidance } from '@/lib/permissions'
import type { CapturePosition } from './captureFlow'

const LocationPickerMap = lazy(() =>
  import('@/components/map/LocationPickerMap').then((m) => ({ default: m.LocationPickerMap })),
)

type Props = {
  position: CapturePosition | null
  approxOnly: boolean
  /** Geolocation outcome cached by the equipment gate, if it ran. */
  primedFix: GeoFix | null
  onPositionChanged: (position: CapturePosition) => void
  onApproxToggled: () => void
  onNext: () => void
}

type GeoState = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable'

function geoMessageFor(geo: GeoState): string | null {
  if (geo === 'denied') return locationDenialGuidance()
  if (geo === 'unavailable') {
    return 'No se pudo obtener tu posición. Coloca el pin a mano arrastrando el mapa.'
  }
  return null
}

type PendingFly = { lat: number; lng: number; accuracyM: number }

// easeTo lands exactly on the target unless maxBounds clamps it; anything
// closer than ~10 m is the fly settling, not the initial-load report.
const FLY_MATCH_EPSILON = 1e-4

export function LocationStep({
  position,
  approxOnly,
  primedFix,
  onPositionChanged,
  onApproxToggled,
  onNext,
}: Props) {
  const [geo, setGeo] = useState<GeoState>(() =>
    primedFix && primedFix.kind !== 'ok' ? primedFix.kind : 'idle',
  )
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(() =>
    primedFix?.kind === 'ok' ? { lat: primedFix.lat, lng: primedFix.lng } : null,
  )
  // The GPS target in flight: programmatic settles are only tagged as a GPS
  // position when they land ON the target — the map's initial-load report
  // (also programmatic, at the default frame) must not steal the tag.
  const pendingFly = useRef<PendingFly | null>(
    primedFix?.kind === 'ok'
      ? { lat: primedFix.lat, lng: primedFix.lng, accuracyM: primedFix.accuracyM }
      : null,
  )

  async function locate() {
    setGeo('locating')
    const fix = await getGeoFix()
    if (fix.kind !== 'ok') {
      setGeo(fix.kind)
      return
    }
    setGeo('granted')
    pendingFly.current = { lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM }
    setFlyTo({ lat: fix.lat, lng: fix.lng })
  }

  function onCenterChanged(center: { lat: number; lng: number }, byUser: boolean) {
    const target = pendingFly.current
    if (!byUser && target) {
      const landed =
        Math.abs(center.lat - target.lat) < FLY_MATCH_EPSILON &&
        Math.abs(center.lng - target.lng) < FLY_MATCH_EPSILON
      if (landed) {
        pendingFly.current = null
        setGeo('granted')
        onPositionChanged({ ...center, accuracyM: target.accuracyM, source: 'gps' })
      }
      // Not landed yet (initial-load report, or the fly got clamped by the
      // map bounds): wait — the user's own drag always takes over below.
      return
    }
    if (byUser) pendingFly.current = null
    onPositionChanged({ ...center, accuracyM: null, source: 'manual' })
  }

  const outOfBounds = position !== null && !isWithinLaLatina(position.lat, position.lng)
  const canContinue = position !== null && !outOfBounds
  const geoMessage = geoMessageFor(geo)

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
