// Location step (LCHP-14, LCHP-49, LCHP-54, LCHP-36): the map is the
// screen, the reticle at its visible centre is the pin, and the dock at the
// bottom says what the pin is worth (Alcorqueando's marking screen, D-058).
// The position is always the map's centre (D-052). The map opens on the
// neighbour's live position — the gate secured it before the photo, and the
// watch keeps it up to date while the step is open — and follows each new
// fix until the neighbour drags (then the pin is theirs: `manual`, no
// accuracy claim). A creature is registered where the neighbour stands
// (D-069): the pin can be nudged inside the radius drawn around them, not
// dragged across the barrio, and without a position good enough, or with
// the map zoomed out past the street, the step does not continue. The exact
// coordinate goes to the server untouched (D-049).
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { LocationNotice } from '@/components/map/LocationNotice'
import { locatePanel } from '@/components/map/locatePanel'
import { PrecisionBadge } from '@/components/map/PrecisionBadge'
import { isWithinLaLatina } from '@/lib/geo'
import type { GeoPosition, GeoWatchState } from '@/lib/geoWatch'
import { precisionGuidance } from '@/lib/permissions'
import {
  distanceMeters,
  formatMeters,
  PLAY_RULES,
  presenceAt,
  type Presence,
} from '@/lib/proximity'
import type { CapturePosition } from './captureFlow'

const PickerMap = lazy(() =>
  import('@/components/map/PickerMap').then((m) => ({ default: m.PickerMap })),
)

type Props = {
  /** The page's header (title, close, step indicator): floats over the map. */
  header: ReactNode
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
// Below this the centre of the map is a block, not a doorway (Alcorqueando's
// minMarkZoom).
const MIN_PICK_ZOOM = 16
// GPS noise of a few decimetres is not worth a map move.
const NOISE_M = 0.7
// The reticle's stamp on confirm (Alcorqueando's keyframes), before the step
// gives way to the review.
const STAMP_MS = 380

// The two lines of the dock, in Alcorqueando's voice.
function describe(
  me: GeoPosition | null,
  searching: boolean,
  position: CapturePosition | null,
  outOfBounds: boolean,
  zoomedOut: boolean,
  pin: Presence,
): { title: string; note: string } {
  const aim = `Arrastra el mapa para dejar el pin sobre la criatura, a menos de ${RADIUS} de ti.`
  if (!me && searching) {
    return {
      title: 'Buscando tu posición…',
      note: 'El mapa se centrará en ti en cuanto el móvil la encuentre.',
    }
  }
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
  if (zoomedOut) {
    return {
      title: 'Acerca el mapa hasta ver la calle',
      note: 'Así de lejos no se puede situar la criatura con precisión.',
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

const lessMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

export function LocationStep({
  header,
  position,
  geo,
  onPositionChanged,
  onLocate,
  onNext,
}: Props) {
  const me = geo.kind === 'ok' ? geo.position : null
  const [flyTo, setFlyTo] = useState<Target | null>(null)
  const [zoom, setZoom] = useState<number | null>(null)
  // The map opens on the position the step finds; read once, like the map does.
  const [opensAt] = useState<Target | null>(() => (me ? { lat: me.lat, lng: me.lng } : null))
  // The GPS target in flight: programmatic settles are only tagged as a GPS
  // position when they land ON the target — the map's initial-load report
  // (also programmatic) must not steal the tag unless it opened there.
  const pendingFly = useRef<PendingFly | null>(
    me ? { lat: me.lat, lng: me.lng, accuracyM: me.accuracyM } : null,
  )
  // The map keeps up with the neighbour until they take it; «Volver a mi
  // posición» hands it back.
  const following = useRef(true)
  const followedTo = useRef<Target | null>(opensAt)
  const onPositionChangedRef = useRef(onPositionChanged)
  useEffect(() => {
    onPositionChangedRef.current = onPositionChanged
  })

  // The position the step opened on is its position from the first render:
  // the map's own report of the same centre comes only once its tiles land.
  useEffect(() => {
    if (!opensAt || !pendingFly.current) return
    onPositionChangedRef.current({
      ...opensAt,
      accuracyM: pendingFly.current.accuracyM,
      source: 'gps',
    })
    // the ref stays armed: the map's load report lands on it and is a no-op
  }, [opensAt])

  function goTo(target: GeoPosition) {
    pendingFly.current = { lat: target.lat, lng: target.lng, accuracyM: target.accuracyM }
    followedTo.current = { lat: target.lat, lng: target.lng }
    setFlyTo({ lat: target.lat, lng: target.lng })
  }

  // Each position the watch delivers takes the map along while the neighbour
  // has not taken it, ignoring the GPS's own jitter.
  useEffect(() => {
    if (!me || !following.current) return
    const last = followedTo.current
    if (last && distanceMeters(last, me) < NOISE_M) return
    goTo(me)
  }, [me])

  function onCenterChanged(center: Target, byUser: boolean, atZoom: number) {
    setZoom(atZoom)
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
    if (!byUser) return
    pendingFly.current = null
    following.current = false
    onPositionChanged({ ...center, accuracyM: null, source: 'manual' })
  }

  function recenter() {
    if (!me) return
    following.current = true
    goTo(me)
  }

  // The dock's height is the map's bottom padding, so the map's centre — the
  // pin — is the centre of what the dock leaves visible (Alcorqueando's
  // syncDockHeight).
  const hostRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const [dockH, setDockH] = useState(0)
  useEffect(() => {
    const host = hostRef.current
    const dock = dockRef.current
    if (!host || !dock) return
    const measure = () => {
      const covered = Math.max(
        0,
        Math.round(host.getBoundingClientRect().bottom - dock.getBoundingClientRect().top),
      )
      setDockH((current) => (current === covered ? current : covered))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(dock)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  // The stamp plays, then the review takes over.
  const [stamping, setStamping] = useState(false)
  const stampTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(stampTimer.current), [])
  function confirm() {
    if (stamping) return
    if (lessMotion()) {
      onNext()
      return
    }
    setStamping(true)
    stampTimer.current = setTimeout(onNext, STAMP_MS)
  }

  const outOfBounds = position !== null && !isWithinLaLatina(position.lat, position.lng)
  // While the map is still on its way to the position there is no pin to judge.
  const pin: Presence = me
    ? presenceAt(me, position ?? me, PLAY_RULES.captureRadiusM)
    : { kind: 'unknown' }
  // The barrio's edge is a rule for the neighbour too, not only for the pin.
  const outside = me !== null && !isWithinLaLatina(me.lat, me.lng)
  const zoomedOut = zoom !== null && zoom < MIN_PICK_ZOOM
  const canContinue =
    position !== null && !outOfBounds && !outside && !zoomedOut && pin.kind === 'near'
  // Vague and outside are the dock's lines below; the notice is for a
  // position that is missing altogether.
  const panel = me ? null : locatePanel(geo, false)
  const { title, note } = describe(
    me,
    geo.kind === 'searching',
    position,
    outOfBounds,
    zoomedOut,
    pin,
  )
  const far = me !== null && !canContinue
  const dockVars: CSSProperties & Record<'--dock-h', string> = { '--dock-h': `${dockH}px` }

  return (
    <div ref={hostRef} className="hunt-map" style={dockVars}>
      <div className="hunt-map-canvas">
        <Suspense
          fallback={
            <div className="panel center" style={{ position: 'absolute', inset: 0 }}>
              cargando mapa…
            </div>
          }
        >
          <PickerMap
            initialCenter={opensAt}
            flyTo={flyTo}
            me={me ? { lat: me.lat, lng: me.lng, accuracyM: me.accuracyM } : null}
            rangeM={PLAY_RULES.captureRadiusM}
            bottomPadding={dockH}
            onCenterChanged={onCenterChanged}
          />
        </Suspense>
      </div>

      <div className="hunt-map-top">
        <div className="panel hunt-map-card stack" style={{ gap: 10 }}>
          {header}
        </div>
      </div>

      {/* The reticle is the pin: its centre is the map's centre. */}
      <div
        className={'reticle' + (far ? ' is-far' : '') + (stamping ? ' is-stamping' : '')}
        aria-hidden
        data-testid="reticle"
      >
        <svg viewBox="0 0 72 72" width="72" height="72">
          <rect className="reticle-stamp" x="10" y="10" width="52" height="52" rx="13" />
          <path
            className="reticle-halo"
            d="M6 24V14a8 8 0 0 1 8-8h10M48 6h10a8 8 0 0 1 8 8v10M66 48v10a8 8 0 0 1-8 8H48M24 66H14a8 8 0 0 1-8-8V48"
          />
          <path
            className="reticle-line"
            d="M6 24V14a8 8 0 0 1 8-8h10M48 6h10a8 8 0 0 1 8 8v10M66 48v10a8 8 0 0 1-8 8H48M24 66H14a8 8 0 0 1-8-8V48"
          />
          <circle className="reticle-halo-dot" cx="36" cy="36" r="5" />
          <circle className="reticle-dot" cx="36" cy="36" r="3" />
        </svg>
      </div>

      <div ref={dockRef} className="hunt-dock" aria-label="Situar la criatura">
        {panel && <LocationNotice panel={panel} onAction={onLocate} />}
        <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
          <span className="hunt-dock-lead">{title}</span>
          {me && <PrecisionBadge accuracyM={me.accuracyM} at={me.at} />}
        </div>
        <div className="hunt-dock-note">{note}</div>
        <div className="row" style={{ gap: 8 }}>
          {me && (
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={recenter}>
              📡 Volver a mi posición
            </button>
          )}
          <button
            type="button"
            className="btn btn-cta"
            style={{ flex: 1.3, opacity: canContinue ? 1 : 0.45 }}
            disabled={!canContinue || stamping}
            onClick={confirm}
          >
            ▸ Revisa y envía
          </button>
        </div>
        <p className="hunt-dock-fine">
          Por privacidad, en el mapa solo se muestra una ubicación aproximada.
        </p>
      </div>
    </div>
  )
}
