// The prototype's toast (app.jsx): green pill sliding in at the top.
// Purely presentational; visibility/timeout is the caller's state.
export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      className="popin"
      role="status"
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        background: 'var(--good)',
        color: '#06281a',
        border: 'var(--bw) solid var(--line)',
        borderRadius: 999,
        padding: '8px 18px',
        fontFamily: 'var(--font-display)',
        fontSize: 11,
        boxShadow: 'var(--shadow)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}
