// The box that says what the app knows about the neighbour's position and
// offers the one thing to do about it. One component for the map's sheet,
// the capture gate and the location step (LCHP-49, LCHP-54); the words come
// from locatePanel().
import type { CSSProperties } from 'react'
import type { LocatePanel } from './locatePanel'

type Props = {
  panel: LocatePanel
  /** The tap that starts the watch. Without it the notice only informs. */
  onAction?: () => void
  /** Offered where looking is enough (the map); not where the position is the door. */
  onDismiss?: () => void
  style?: CSSProperties
}

export function LocationNotice({ panel, onAction, onDismiss, style }: Props) {
  return (
    <div
      className="panel panel-2 pad row"
      role="status"
      style={{ padding: 10, gap: 8, fontSize: 12, boxShadow: 'none', ...style }}
    >
      <span className="grow" style={{ color: 'var(--ink-dim)' }}>
        {panel.text}
      </span>
      {panel.action && onAction && (
        <button type="button" className="chip chip-accent map-locate-ask" onClick={onAction}>
          {panel.action}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          className="chip chip-ghost"
          aria-label="Cerrar aviso"
          onClick={onDismiss}
        >
          ✕
        </button>
      )}
    </div>
  )
}
