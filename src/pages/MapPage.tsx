// Map screen (LCHP-13): real MapLibre map reading public_map_sightings.
// Validated sightings show the species sprite; pending ones blink with an
// amber ring. The detail sheet shows species · status · age · approximate
// location — NO author and NO exact street (the public view exposes neither;
// golden rule / D-037). «Ver evidencia» loads the photo on demand.
// «Verificar» (LCHP-15) opens the real verification modal from its two
// doors — the pin card and the «Cerca de ti» list — and the outcome toast
// mirrors what the consolidation trigger actually did.
import { lazy, Suspense, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { VerifyModal } from '@/components/sightings/VerifyModal'
import { Toast } from '@/components/ui/Toast'
import { formatAge } from '@/lib/age'
import { getEvidenceUrl, type EvidenceResult } from '@/services/evidence.service'
import { listMapSightings } from '@/services/sightings.service'
import { listSpecies } from '@/services/species.service'
import type { VerifyOutcome } from '@/services/verifications.service'
import type { MapSightingGeo } from '@/types/sighting'

// MapLibre is ~210 KB gzipped (spike LCHP-4): load it only on /mapa.
const BarrioMap = lazy(() =>
  import('@/components/map/BarrioMap').then((m) => ({ default: m.BarrioMap })),
)

function SightingMarker({ sighting, selected }: { sighting: MapSightingGeo; selected: boolean }) {
  const pending = sighting.status === 'pending'
  return (
    <div
      style={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 8,
        background: 'var(--card)',
        border: `2px solid ${selected ? 'var(--accent)' : pending ? 'var(--warn)' : 'var(--line)'}`,
        boxShadow: selected ? '0 0 0 3px var(--accent)' : '0 1px 3px rgba(0,0,0,0.25)',
        animation: pending ? 'blinkdot 1.4s ease-in-out infinite' : 'none',
      }}
    >
      <CreatureSprite id={sighting.speciesId} scale={2} />
    </div>
  )
}

// Evidence is keyed to the sighting that requested it (Codex review, HIGH):
// a late response for sighting A must never render under sighting B.
type EvidenceState = { sightingId: string; state: 'loading' | EvidenceResult } | null

const VERIFY_TOASTS: Record<VerifyOutcome['kind'], string> = {
  validated: 'Avistamiento validado · +10 para el autor · +5 para ti',
  counted: 'Confirmación registrada · +5 cuando se valide',
  saved_provisional: 'Apoyo guardado · regístrate para que cuente y cobrar tus +5',
  already_verified: 'Ya habías verificado este avistamiento',
  not_verifiable: 'Este avistamiento ya no se puede verificar',
  error: 'No se pudo enviar, inténtalo de nuevo',
}

export function MapPage() {
  const queryClient = useQueryClient()
  const [heat, setHeat] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [evidence, setEvidence] = useState<EvidenceState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Monotonic token so only the LATEST evidence request wins — covers both a
  // different-sighting switch and same-sighting re-taps (Codex review): an
  // older response (even a late error) never clobbers a newer one.
  const evidenceReq = useRef(0)

  const pick = (id: string) => {
    setSel(id)
    setVerifying(false)
    setEvidence(null)
    evidenceReq.current++ // drop any in-flight request from the previous pin
  }

  const onVerifyResult = (outcome: VerifyOutcome) => {
    setVerifying(false)
    showToast(VERIFY_TOASTS[outcome.kind])
    if (
      outcome.kind === 'validated' ||
      outcome.kind === 'counted' ||
      outcome.kind === 'saved_provisional'
    ) {
      // The pin may stop blinking / the count may move: re-read the public
      // view on every stored confirmation (a provisional one can still have
      // validated the sighting when the operational switch is open).
      void queryClient.invalidateQueries({ queryKey: ['sightings', 'map'] })
    }
  }

  const loadEvidence = async (id: string) => {
    const token = ++evidenceReq.current
    setEvidence({ sightingId: id, state: 'loading' })
    const result = await getEvidenceUrl(id)
    if (evidenceReq.current !== token) return // superseded by a newer request
    setEvidence({ sightingId: id, state: result })
  }

  // Dismissing must also invalidate the in-flight token so a late response
  // can't reopen the overlay after the user closed it (Codex review).
  const closeEvidence = () => {
    evidenceReq.current++
    setEvidence(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const {
    data: sightings = [],
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sightings', 'map'],
    queryFn: listMapSightings,
  })
  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  const speciesName = (id: string) => species.find((c) => c.id === id)?.name ?? ''
  const pending = sightings.filter((s) => s.status === 'pending')
  const selS = sightings.find((s) => s.id === sel)

  return (
    <div
      className="screen"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div
        className="pad"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
          flex: '1 1 auto',
          minHeight: 0,
          paddingBottom: 8,
        }}
      >
        <div>
          <div className="eyebrow">Mapa del barrio</div>
          <div className="scr-title" style={{ fontSize: 20 }}>
            Avistamientos en La Latina
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            className={'chip ' + (!heat ? 'chip-accent' : 'chip-ghost')}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setHeat(false)}
          >
            Avistamientos
          </button>
          <button
            className={'chip ' + (heat ? 'chip-accent' : 'chip-ghost')}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setHeat(true)}
          >
            Mapa de calor
          </button>
        </div>

        <div
          style={{
            flex: '1 1 0',
            minHeight: 120,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 12,
          }}
        >
          <Suspense
            fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--bg2)' }} />}
          >
            <BarrioMap
              sightings={heat || isError ? [] : sightings}
              selectedId={sel}
              onPick={pick}
              renderMarker={(s, selected) => <SightingMarker sighting={s} selected={selected} />}
            />
          </Suspense>
          {/* a failed read must LOOK failed, never like a valid empty map */}
          {isError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
              }}
            >
              <div className="panel pad stack center" style={{ padding: 16, gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  No se pudieron cargar los avistamientos
                </span>
                <button type="button" className="btn btn-accent" onClick={() => void refetch()}>
                  Reintentar
                </button>
              </div>
            </div>
          )}
          {heat && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <span className="chip chip-ghost mono" style={{ fontSize: 10 }}>
                Mapa de calor · próximamente
              </span>
            </div>
          )}
        </div>

        {/* legend (4 in one row) */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flexShrink: 0 }}
        >
          {species.map((c) => (
            <div key={c.id} className="stack center" style={{ gap: 3 }}>
              <CreatureSprite id={c.id} scale={2} />
              <span
                className="mono"
                style={{
                  fontSize: 8.5,
                  color: 'var(--ink-dim)',
                  textAlign: 'center',
                  lineHeight: 1,
                }}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>

        {/* pin popover — z-index keeps it above the «Cerca de ti» list's
            absolutely-positioned sprites when the two overlap (LCHP-32, D-057) */}
        {selS && (
          <div
            className="panel pad slidein"
            style={{ padding: 14, position: 'relative', zIndex: 1 }}
          >
            <div className="row" style={{ gap: 12 }}>
              <div
                className="panel-2 center"
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 8,
                  border: 'var(--bw) solid var(--line)',
                }}
              >
                <CreatureSprite id={selS.speciesId} scale={3} />
              </div>
              <div className="grow">
                <div className="display" style={{ fontSize: 12 }}>
                  {speciesName(selS.speciesId)}
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  Ubicación aproximada · La Latina · {formatAge(selS.createdAt)}
                </div>
              </div>
              <span className={'chip ' + (selS.status === 'pending' ? 'chip-warn' : 'chip-good')}>
                {selS.status === 'pending' ? 'Por verificar' : 'Validado'}
              </span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => void loadEvidence(selS.id)}
              >
                Ver evidencia
              </button>
              {selS.status === 'pending' && (
                <button
                  type="button"
                  className="btn btn-accent"
                  style={{ flex: 1 }}
                  onClick={() => setVerifying(true)}
                >
                  ✔ Verificar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* pending nearby (the only scrolling zone) */}
      <div
        className="pad stack"
        style={{
          gap: 8,
          flex: '0 0 auto',
          maxHeight: '46%',
          minHeight: 168,
          overflowY: 'auto',
          paddingTop: 4,
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">Cerca de ti</span>
          {!isError && <span className="chip chip-warn">{pending.length} Por verificar</span>}
        </div>
        {pending.map((s) => (
          <button
            key={s.id}
            type="button"
            className="panel pad"
            onClick={() => {
              pick(s.id)
              setVerifying(true) // the list is the second door to the modal
            }}
            style={{
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <CreatureSprite id={s.speciesId} scale={2.8} />
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 14 }}>{speciesName(s.speciesId)}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                La Latina · {formatAge(s.createdAt)}
              </div>
            </div>
            <span className="chip chip-accent">Verificar</span>
          </button>
        ))}
      </div>

      {/* verification modal (LCHP-15): only over a pending selection */}
      {verifying && selS && selS.status === 'pending' && (
        <VerifyModal
          sighting={selS}
          speciesName={speciesName(selS.speciesId)}
          onClose={() => setVerifying(false)}
          onResult={onVerifyResult}
          onReclassify={() => showToast('Reclasificar · próximamente')}
        />
      )}

      {/* evidence overlay (brief §18): the photo is on-demand proof, shown
          over the map like the mockup's verify modal — never inline, never
          preloaded */}
      {evidence && selS && evidence.sightingId === selS.id && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 80,
            display: 'flex',
            alignItems: 'flex-end',
            background: 'rgba(0,0,0,0.55)',
          }}
          onClick={closeEvidence}
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
                Evidencia · {speciesName(selS.speciesId)}
              </span>
              <button
                type="button"
                className="chip chip-ghost"
                onClick={closeEvidence}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {evidence.state === 'loading' && (
              <div className="photo-ph center" style={{ height: 220 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  Cargando foto…
                </span>
              </div>
            )}
            {typeof evidence.state === 'object' && evidence.state.kind === 'ready' && (
              <img
                src={evidence.state.url}
                alt={`Evidencia del avistamiento de ${speciesName(selS.speciesId)}`}
                style={{
                  width: '100%',
                  maxHeight: 320,
                  objectFit: 'contain',
                  borderRadius: 8,
                  border: 'var(--bw) solid var(--line)',
                  background: 'var(--bg2)',
                }}
              />
            )}
            {typeof evidence.state === 'object' && evidence.state.kind !== 'ready' && (
              <div className="photo-ph center" style={{ height: 120 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  {evidence.state.kind === 'unavailable'
                    ? 'Este avistamiento aún no tiene foto disponible'
                    : 'No se pudo cargar la foto, inténtalo de nuevo'}
                </span>
              </div>
            )}
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 10 }}>
              Ubicación aproximada · La Latina · {formatAge(selS.createdAt)}
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
