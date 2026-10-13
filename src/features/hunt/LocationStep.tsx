// Real location step (LCHP-14/LCHP-28): the position is always the picker
// map's center (fixed center pin, D-052). The gate may hand over a cached GPS
// fix so the map opens pre-centered without re-prompting; «Usar mi ubicación»
// fires the native prompt ON TAP for anyone who skipped it. The exact
// coordinate goes to the server untouched (D-049).
//
// A creature is registered where the neighbour stands (LCHP-49, D-066,
// Alcorqueando's rules): the pin can be nudged around their position, not
// dragged across the barrio, and without a position good enough there is no
// pin at all. The fix is still a one-shot; the watch comes with LCHP-36.
import { lazy, Suspense, useRef, useState } from 'react'
import { PrecisionBadge } from '@/components/map/PrecisionBadge'
import { getGeoFix, isWithinLaLatina, type GeoFix } from '@/lib/geo'
import { locationSettingsGuidance, precisionGuidance } from '@/lib/permissions'
import { formatMeters, PLAY_RULES, presenceAt, type Presence } from '@/lib/proximity'
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
  if (geo === 'denied') return locationSettingsGuidance()
  if (geo === 'unavailable') {
    return 'No se pudo obtener tu posición. Inténtalo otra vez al aire libre.'
  }
  return null
}

type PendingFly = { lat: number; lng: number; accuracyM: number }
/** Where the neighbour stands, and when the phone said so. */
type Fix = PendingFly & { at: number }

const RADIUS = formatMeters(PLAY_RULES.captureRadiusM)

// The two lines under the map, in Alcorqueando's voice.
function describe(
  fix: Fix | null,
  position: CapturePosition | null,
  outOfBounds: boolean,
  pin: Presence,
): { title: string; note: string } {
  const aim = `Arrastra el mapa para dejar el pin sobre la criatura, a menos de ${RADIUS} de ti.`
  if (!fix) {
    return {
      title: 'Activa tu ubicación para situar la criatura',
      note: 'Solo se puede registrar una criatura estando junto a ella.',
    }
  }
  if (pin.kind === 'vague') {
    return {
      title: `Tu ubicación es poco precisa (± ${formatMeters(pin.accuracyM)})`,
      note: `Así no se puede situar la criatura. ${precisionGuidance()}`,
    }
  }
  if (!isWithinLaLatina(fix.lat, fix.lng)) {
    return {
      title: 'Estás fuera de La Latina',
      note: 'Solo se registran criaturas dentro del barrio.',
    }
  }
  if (outOfBounds) return { title: 'El pin está fuera de La Latina', note: aim }
  if (pin.kind === 'far') {
    return {
      title: `Ese punto está a ${formatMeters(pin.distanceM)} de ti. El máximo son ${RADIUS}.`,
      note: 'Vuelve a tu posición y acerca el pin a la criatura.',
    }
  }
  if (pin.kind === 'near' && position?.source === 'manual') {
    return { title: `Pin ajustado a mano · a ${formatMeters(pin.distanceM)} de ti`, note: aim }
  }
  return { title: 'Tu posición', note: aim }
}

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
  // The gate's fix keeps the time it was read at: a photo and a species
  // later it may be minutes old, and the badge must say so.
  const [fix, setFix] = useState<Fix | null>(() =>
    primedFix?.kind === 'ok'
      ? {
          lat: primedFix.lat,
          lng: primedFix.lng,
          accuracyM: primedFix.accuracyM,
          at: primedFix.at,
        }
      : null,
  )

  async function locate() {
    setGeo('locating')
    const fix = await getGeoFix()
    if (fix.kind !== 'ok') {
      // The rule needs a position: an older one is not kept as if it held.
      setFix(null)
      setGeo(fix.kind)
      return
    }
    setGeo('granted')
    const next = { lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM }
    setFix({ ...next, at: fix.at })
    pendingFly.current = next
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
  // While the map is still on its way to the fix there is no pin to judge.
  const pin: Presence = fix
    ? presenceAt(fix, position ?? fix, PLAY_RULES.captureRadiusM)
    : { kind: 'unknown' }
  // The barrio's edge is a rule for the neighbour too, not only for the pin.
  const outside = fix !== null && !isWithinLaLatina(fix.lat, fix.lng)
  const canContinue = position !== null && !outOfBounds && !outside && pin.kind === 'near'
  const geoMessage = geoMessageFor(geo)
  const { title, note } = describe(fix, position, outOfBounds, pin)

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
        {geo === 'locating'
          ? 'Localizando…'
          : fix
            ? '📡 Volver a mi posición'
            : '📡 Usar mi ubicación'}
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
        <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          {fix && <PrecisionBadge accuracyM={fix.accuracyM} at={fix.at} />}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>{note}</div>
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
