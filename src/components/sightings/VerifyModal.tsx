// Verification modal ported from the prototype (screens2.jsx VerifyModal).
// M1: static simulation — Confirmar fires onConfirm (toast in the caller),
// Reclasificar/Saltar just close. The real transaction arrives in LCHP-15.
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import type { MapSighting } from '@/types/sighting'

export function VerifyModal({
  sighting,
  speciesName,
  onClose,
  onConfirm,
}: {
  sighting: MapSighting
  speciesName: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 80,
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
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="display" style={{ fontSize: 13 }}>
            Verificar avistamiento
          </span>
          <button type="button" className="chip chip-ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="photo-ph center" style={{ height: 150, marginBottom: 12 }}>
          <CreatureSprite id={sighting.speciesId} scale={6} />
          <span style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
            foto del avistamiento {sighting.id}
          </span>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <CreatureSprite id={sighting.speciesId} scale={3} />
          <div className="grow">
            <div className="display" style={{ fontSize: 12 }}>
              {speciesName}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              {sighting.street}
            </div>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              Reportado por
            </span>
            <span className="mono" style={{ fontSize: 11 }}>
              @{sighting.reportedBy}
            </span>
          </div>
        </div>

        <div
          className="panel panel-2 pad"
          style={{
            padding: 10,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 14,
            borderStyle: 'dashed',
          }}
        >
          <span style={{ fontSize: 14 }}>🛡️</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-dim)' }}>
            Comprueba que no aparezcan personas ni datos privados.
          </span>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ margin: '0 0 4px', fontSize: 13, textAlign: 'center' }}>
            ¿La criatura está bien clasificada?
          </p>
          <button type="button" className="btn btn-accent" onClick={onConfirm}>
            ✔ Confirmar (+5 pts)
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={onClose}>
              Reclasificar
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Saltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
