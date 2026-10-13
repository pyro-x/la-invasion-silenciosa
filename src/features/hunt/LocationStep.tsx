// Location step (LCHP-14, LCHP-49, LCHP-54): the position is always the
// picker map's centre (fixed centre pin, D-052). The map opens on the
// neighbour's live position — the gate secured it before the photo, and the
// watch keeps it up to date while the step is open. A creature is registered
// where the neighbour stands (D-069, Alcorqueando's rules): the pin can be
// nudged around their position, not dragged across the barrio, and without a
// position good enough the step does not continue. A later position
// re-judges the pin where it is; it does not move the map (following on this
// step is LCHP-36). The exact coordinate goes to the server untouched (D-049).
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { LocationNotice } from '@/components/map/LocationNotice'
import { locatePanel } from '@/components/map/locatePanel'
import { PrecisionBadge } from '@/components/map/PrecisionBadge'
import { isWithinLaLatina } from '@/lib/geo'
import type { GeoPosition, GeoWatchState } from '@/lib/geoWatch'
import { precisionGuidance } from '@/lib/permissions'
import { formatMeters, PLAY_RULES, presenceAt, type Presence } from '@/lib/proximity'
import type { CapturePosition } from './captureFlow'

const LocationPickerMap = lazy(() =>
  import('@/components/map/LocationPickerMap').then((m) => ({ default: m.LocationPickerMap })),
)

type Props = {
  position: CapturePosition | null
  geo: GeoWatchState
  onPositionChanged: (position: CapturePosition) => void
  /** The tap that starts the watch again when the position was lost. */
  onLocate: () => void
  onNext: () => void
}

type Target = { lat: number; lng: number }
type PendingFly = Target & { accuracyM: number }

const RADIUS = formatMeters(PLAY_RULES.captureRadiusM)

// The two lines under the map, in Alcorqueando's voice.
function describe(
  me: GeoPosition | null,
  position: CapturePosition | null,
  outOfBounds: boolean,
  pin: Presence,
): { title: string; note: string } {
  const aim = `Arrastra el mapa para dejar el pin sobre la criatura, a menos de ${RADIUS} de ti.`
  if (!me) {
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
  if (!isWithinLaLatina(me.lat, me.lng)) {
    return {
      title: 'Estás fuera de La Latina',
      note: 'Solo se registran criaturas dentro del barrio.',
    }
  }
  if (outOfBounds) return { title: 'El pin está fuera de La Latina', note: aim }
  if (pin.kind === 'far') {
    return {
      // rounded up: never «a 50 m» against a maximum of 50 m
      title: `Ese punto está a ${formatMeters(Math.ceil(pin.distanceM))} de ti. El máximo son ${RADIUS}.`,
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

export function LocationStep({ position, geo, onPositionChanged, onLocate, onNext }: Props) {
  const me = geo.kind === 'ok' ? geo.position : null
  const [flyTo, setFlyTo] = useState<Target | null>(null)
  // The map opens on the position the step finds; read once, like the map does.
  const [opensAt] = useState<Target | null>(() => (me ? { lat: me.lat, lng: me.lng } : null))
  // The GPS target in flight: programmatic settles are only tagged as a GPS
  // position when they land ON the target — the map's initial-load report
  // (also programmatic) must not steal the tag unless it opened there.
  const pendingFly = useRef<PendingFly | null>(
    me ? { lat: me.lat, lng: me.lng, accuracyM: me.accuracyM } : null,
  )
  const centred = useRef(me !== null)

  function goTo(target: GeoPosition) {
    pendingFly.current = { lat: target.lat, lng: target.lng, accuracyM: target.accuracyM }
    setFlyTo({ lat: target.lat, lng: target.lng })
  }

  // A position that arrives while the step had none takes the map there;
  // the ones after it only re-judge the pin.
  useEffect(() => {
    if (!me || centred.current) return
    centred.current = true
    goTo(me)
  }, [me])

  function onCenterChanged(center: Target, byUser: boolean) {
    const target = pendingFly.current
    if (!byUser && target) {
      const landed =
        Math.abs(center.lat - target.lat) < FLY_MATCH_EPSILON &&
        Math.abs(center.lng - target.lng) < FLY_MATCH_EPSILON
      if (landed) {
        pendingFly.current = null
        onPositionChanged({ ...center, accuracyM: target.accuracyM, source: 'gps' })
      }
      // Not landed yet (initial-load report on the barrio frame, or the fly
      // got clamped by the map bounds): wait — the user's own drag always
      // takes over below.
      return
    }
    if (byUser) pendingFly.current = null
    onPositionChanged({ ...center, accuracyM: null, source: 'manual' })
  }

  const outOfBounds = position !== null && !isWithinLaLatina(position.lat, position.lng)
  // While the map is still on its way to the position there is no pin to judge.
  const pin: Presence = me
    ? presenceAt(me, position ?? me, PLAY_RULES.captureRadiusM)
    : { kind: 'unknown' }
  // The barrio's edge is a rule for the neighbour too, not only for the pin.
  const outside = me !== null && !isWithinLaLatina(me.lat, me.lng)
  const canContinue = position !== null && !outOfBounds && !outside && pin.kind === 'near'
  // Vague and outside are the panel's lines below; the notice is for a
  // position that is missing altogether.
  const panel = me ? null : locatePanel(geo, false)
  const { title, note } = describe(me, position, outOfBounds, pin)

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
          <LocationPickerMap
            initialCenter={opensAt}
            flyTo={flyTo}
            onCenterChanged={onCenterChanged}
          />
        </Suspense>
      </div>

      {me && (
        <button className="btn btn-accent" onClick={() => goTo(me)}>
          📡 Volver a mi posición
        </button>
      )}

      {panel && <LocationNotice panel={panel} onAction={onLocate} />}

      <div className="panel pad" style={{ padding: 14 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 4 }}>
          UBICACIÓN DEL AVISTAMIENTO
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          {me && <PrecisionBadge accuracyM={me.accuracyM} at={me.at} />}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>{note}</div>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        Por privacidad, en el mapa solo se muestra una ubicación aproximada.
      </p>

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
