// Golden-rule reminder shown on the photo and review steps (brief §3.1).
export function PrivacyNote() {
  return (
    <div
      className="panel panel-2 pad"
      style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', borderStyle: 'dashed' }}
    >
      <span style={{ fontSize: 16 }}>🛡️</span>
      <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
        Nada de personas, matrículas ni datos privados.
      </span>
    </div>
  )
}
