// The door of the capture flow (LCHP-28, LCHP-54): a rationale screen shown
// whenever a permission is still missing — the camera not granted, or no
// position yet. One tap asks for both; the flow opens once the camera has
// answered and the watch has a position. A camera denial is not a wall (the
// system camera and the gallery remain, D-050); a location denial is: a
// creature is registered where the neighbour stands (D-069), so there is no
// «Ahora no». Purely presentational — HuntPage owns the arming (stream and
// watch lifecycles need the page's lifetime).
import { Link } from 'react-router'
import { LocationNotice } from '@/components/map/LocationNotice'
import { locatePanel } from '@/components/map/locatePanel'
import type { GeoWatchState } from '@/lib/geoWatch'
import { gateSeenBefore, iosRememberTip, markGateSeen } from '@/lib/permissions'
import { PrivacyNote } from './PrivacyNote'

type Props = {
  geo: GeoWatchState
  /** The camera is already granted: the tap only asks for the position. */
  cameraReady: boolean
  /** The position is in hand, or on its way from a watch already granted. */
  located: boolean
  /** The tap asked for the position and the phone has not answered yet. */
  waitingForFix: boolean
  /** The camera request is in flight. */
  arming: boolean
  onArm: () => void
}

type Labels = Pick<Props, 'geo' | 'cameraReady' | 'located' | 'waitingForFix' | 'arming'>

function buttonLabel({ geo, cameraReady, located, waitingForFix, arming }: Labels): string {
  if (arming) return 'Esperando permisos…'
  if (waitingForFix) return 'Buscando tu posición…'
  switch (geo.kind) {
    case 'denied':
    case 'unavailable':
    case 'timeout':
      return cameraReady ? '⟳ Reintentar' : '⟳ Reintentar y activar la cámara'
    case 'unsupported':
      return 'Sin ubicación en este navegador'
    default:
      if (cameraReady) return '✓ Activar mi ubicación'
      return located ? '✓ Activar la cámara' : '✓ Activar cámara y ubicación'
  }
}

export function EquipmentGate(props: Props) {
  const { geo, waitingForFix, arming, onArm } = props
  const rememberTip = gateSeenBefore() ? iosRememberTip() : null
  // The button is the action: the notice only says where the position stands.
  const panel = geo.kind === 'idle' || geo.kind === 'ok' ? null : locatePanel(geo, false)
  const busy = arming || waitingForFix || geo.kind === 'unsupported'

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="panel pad" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>🎒</div>
        <h2 className="display" style={{ fontSize: 16, margin: '10px 0 6px' }}>
          ¡Prepara tu equipo!
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>
          Para cazar necesitas la <strong>cámara</strong> y tu <strong>ubicación</strong>: una
          criatura solo se registra estando junto a ella.
        </p>
      </div>

      <PrivacyNote />

      {panel && <LocationNotice panel={panel} />}

      {rememberTip && (
        <div
          className="panel panel-2 pad"
          style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-dim)' }}
        >
          💡 {rememberTip}
        </div>
      )}

      <button
        className="btn btn-accent"
        onClick={() => {
          markGateSeen()
          onArm()
        }}
        disabled={busy}
      >
        {buttonLabel(props)}
      </button>
      <Link
        to="/mapa"
        className="btn"
        style={{ background: 'transparent', border: 'none', color: 'var(--ink-dim)' }}
      >
        Volver al mapa
      </Link>
    </div>
  )
}
