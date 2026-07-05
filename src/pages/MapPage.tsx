// Map screen ported from the prototype (screens1.jsx MapScreen): SVG street
// map with Sightings/Heatmap toggle, blinking pending pins, pin popover, the
// «Cerca de ti» pending list and the static verification modal (LCHP-23) —
// Confirmar only shows the mockup's «+5» toast; the real transaction is M5.
import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { StreetMap } from '@/components/map/StreetMap'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { VerifyModal } from '@/components/sightings/VerifyModal'
import { Toast } from '@/components/ui/Toast'
import { listMapSightings } from '@/services/sightings.service'
import { listSpecies } from '@/services/species.service'
import type { MapSighting } from '@/types/sighting'

export function MapPage() {
  const [heat, setHeat] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [verify, setVerify] = useState<MapSighting | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const confirmVerify = () => {
    setVerify(null)
    showToast('+5 · verificación')
  }
  const { data: sightings = [] } = useQuery({
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

        <div style={{ flex: '1 1 0', minHeight: 120, position: 'relative' }}>
          <StreetMap
            heat={heat}
            sightings={sightings}
            onPick={(s) => setSel(s.id)}
            selected={sel}
          />
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

        {/* pin popover */}
        {selS && (
          <div className="panel pad slidein" style={{ padding: 14 }}>
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
                  {selS.street} · {selS.reportedAgo}
                </div>
              </div>
              <span className={'chip ' + (selS.status === 'pending' ? 'chip-warn' : 'chip-good')}>
                {selS.status === 'pending' ? 'Por verificar' : 'Validado'}
              </span>
            </div>
            {selS.status === 'pending' && (
              <button
                type="button"
                className="btn btn-accent"
                style={{ marginTop: 12 }}
                onClick={() => setVerify(selS)}
              >
                ✔ Verificar
              </button>
            )}
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
          <span className="chip chip-warn">{pending.length} Por verificar</span>
        </div>
        {pending.map((s) => (
          <button
            key={s.id}
            type="button"
            className="panel pad"
            onClick={() => setVerify(s)}
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
                {s.street} · @{s.reportedBy}
              </div>
            </div>
            <span className="chip chip-accent">Verificar</span>
          </button>
        ))}
      </div>

      {verify && (
        <VerifyModal
          sighting={verify}
          speciesName={speciesName(verify.speciesId)}
          onClose={() => setVerify(null)}
          onConfirm={confirmVerify}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
