// The invitation overlay (LCHP-30): a milestone prompt that opens the real
// registration flow IN PLACE — the neighbor never loses the screen they
// were on. Dismissing is always one tap.
import { useState } from 'react'
import { RegistrationPanel } from './RegistrationPanel'

export function InvitationModal({
  eyebrow,
  message,
  onClose,
}: {
  eyebrow: string
  message: string
  onClose: () => void
}) {
  const [registered, setRegistered] = useState(false)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 85,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={onClose}
    >
      <div
        className="panel slidein"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          borderRadius: 'var(--radius) var(--radius) 0 0',
          padding: 18,
          boxShadow: 'none',
          borderBottom: 'none',
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="display" style={{ fontSize: 13 }}>
            {eyebrow}
          </span>
          <button type="button" className="chip chip-ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 13.5 }}>{message}</p>

        <RegistrationPanel onRegistered={() => setRegistered(true)} />

        <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>
          {registered ? '✓ Seguir donde estaba' : 'Ahora no →'}
        </button>
      </div>
    </div>
  )
}
