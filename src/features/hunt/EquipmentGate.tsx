// Permission gate at capture entry (LCHP-28): a rationale screen shown only
// when a native prompt is actually coming (camera not granted). Purely
// presentational — HuntPage owns the arming (stream/fix lifecycles need the
// page's lifetime; Codex review: a granted stream held inside the gate would
// leak if the user left mid-wait).
import { gateSeenBefore, iosRememberTip, markGateSeen } from '@/lib/permissions'
import { PrivacyNote } from './PrivacyNote'

type Props = {
  arming: boolean
  onArm: () => void
  onSkip: () => void
}

export function EquipmentGate({ arming, onArm, onSkip }: Props) {
  const rememberTip = gateSeenBefore() ? iosRememberTip() : null

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="panel pad" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>🎒</div>
        <h2 className="display" style={{ fontSize: 16, margin: '10px 0 6px' }}>
          ¡Prepara tu equipo!
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-dim)' }}>
          Para cazar necesitas la <strong>cámara</strong>. Tu <strong>ubicación</strong> es
          opcional: sitúa el pin por ti (si no, lo colocas a mano).
        </p>
      </div>

      <PrivacyNote />

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
        disabled={arming}
      >
        {arming ? 'Esperando permisos…' : '✓ Activar cámara y ubicación'}
      </button>
      <button
        className="btn"
        onClick={onSkip}
        disabled={arming}
        style={{ background: 'transparent', border: 'none', color: 'var(--ink-dim)' }}
      >
        Ahora no →
      </button>
    </div>
  )
}
