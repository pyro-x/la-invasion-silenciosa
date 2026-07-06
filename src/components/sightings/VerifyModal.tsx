// Verification modal (LCHP-15): the real transaction behind the mockup's
// screens2.jsx VerifyModal. The photo loads when the modal opens — the
// evidence IS what the neighbor judges, so it is never optional — and shows
// species + approximate location only: the public surface carries NO author
// and NO street (D-046/D-037). «Reclasificar» stays post-MVP.
import { useEffect, useState } from 'react'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { formatAge } from '@/lib/age'
import { getEvidenceUrl, type EvidenceResult } from '@/services/evidence.service'
import { submitVerification, type VerifyOutcome } from '@/services/verifications.service'
import type { MapSightingGeo } from '@/types/sighting'

export function VerifyModal({
  sighting,
  speciesName,
  onClose,
  onResult,
  onReclassify,
}: {
  sighting: MapSightingGeo
  speciesName: string
  onClose: () => void
  /** Fires once with the transaction's outcome; the caller toasts + closes. */
  onResult: (outcome: VerifyOutcome) => void
  onReclassify: () => void
}) {
  const [evidence, setEvidence] = useState<'loading' | EvidenceResult>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void getEvidenceUrl(sighting.id).then((result) => {
      if (alive) setEvidence(result)
    })
    return () => {
      alive = false
    }
  }, [sighting.id])

  async function confirm() {
    setBusy(true)
    const outcome = await submitVerification(sighting.id)
    setBusy(false)
    onResult(outcome)
  }

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

        <div
          className="photo-ph center"
          style={{ height: 170, marginBottom: 12, overflow: 'hidden' }}
        >
          {evidence === 'loading' && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              Cargando foto…
            </span>
          )}
          {typeof evidence === 'object' && evidence.kind === 'ready' && (
            <img
              src={evidence.url}
              alt={`Evidencia del avistamiento de ${speciesName}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {typeof evidence === 'object' && evidence.kind !== 'ready' && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              {evidence.kind === 'unavailable'
                ? 'Este avistamiento aún no tiene foto disponible'
                : 'No se pudo cargar la foto, inténtalo de nuevo'}
            </span>
          )}
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <CreatureSprite id={sighting.speciesId} scale={3} />
          <div className="grow">
            <div className="display" style={{ fontSize: 12 }}>
              {speciesName}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              Ubicación aproximada · La Latina · {formatAge(sighting.createdAt)}
            </div>
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
          {/* Blind confirmations are a golden-rule hole (Codex review, HIGH):
              the neighbor must be LOOKING at the evidence to vouch for it, so
              the action stays disabled until the photo actually rendered. */}
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => void confirm()}
            disabled={busy || !(typeof evidence === 'object' && evidence.kind === 'ready')}
          >
            {busy ? 'Enviando…' : '✔ Confirmar (+5 pts)'}
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={onReclassify}>
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
