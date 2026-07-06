// Permission gate at capture entry (LCHP-28): a rationale screen shown only
// when a native prompt is actually coming (camera not granted). One tap fires
// both prompts in a single gesture — the granted camera stream is handed live
// to the viewfinder and the geo fix is cached for the location step, so
// nothing the user granted is wasted and no dialog ever interrupts mid-flow.
import { useState } from 'react'
import { getGeoFix, type GeoFix } from '@/lib/geo'
import { CAMERA_CONSTRAINTS, gateSeenBefore, iosRememberTip, markGateSeen } from '@/lib/permissions'
import { PrivacyNote } from './PrivacyNote'

export type Equipment = {
  /** Live rear-camera stream to hand to the viewfinder; null if denied. */
  stream: MediaStream | null
  /** Cached geolocation outcome; null if the gate was skipped. */
  fix: GeoFix | null
}

type Props = {
  onReady: (equipment: Equipment) => void
  onSkip: () => void
}

export function EquipmentGate({ onReady, onSkip }: Props) {
  const [arming, setArming] = useState(false)
  const rememberTip = gateSeenBefore() ? iosRememberTip() : null

  async function arm() {
    setArming(true)
    markGateSeen()
    let stream: MediaStream | null
    try {
      stream = navigator.mediaDevices?.getUserMedia
        ? await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
        : null
    } catch {
      stream = null // denied or unavailable — the photo step degrades
    }
    const fix = await getGeoFix()
    onReady({ stream, fix })
  }

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

      <button className="btn btn-accent" onClick={() => void arm()} disabled={arming}>
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
