// 4-step capture flow, ported from the prototype (screens1.jsx HuntFlow).
// Photo is the prototype placeholder viewer until the real camera lands in M4.
import { useReducer, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { StreetMap } from '@/components/map/StreetMap'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { PixelBurst } from '@/components/pixel/PixelBurst'
import {
  captureFlowReducer,
  initialCaptureFlowState,
  isStepComplete,
} from '@/features/hunt/captureFlow'
import { getApproxLocation, submitSighting } from '@/services/sightings.service'
import { listSpecies } from '@/services/species.service'

const STEP_TITLES = [
  'Captura la criatura',
  'Identifica la especie',
  'Ubicación aproximada',
  'Revisa y envía',
]

// Brief §4: points are never shown as definitive before community validation.
const SUCCESS_MESSAGE = 'Avistamiento enviado · +10 puntos pendientes de validación'

const SENDING_DELAY_MS = 1100

export function HuntPage() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(captureFlowReducer, initialCaptureFlowState)
  const { data: species } = useQuery({ queryKey: ['species'], queryFn: listSpecies })
  const { data: location } = useQuery({
    queryKey: ['capture', 'location'],
    queryFn: getApproxLocation,
  })

  async function submit() {
    if (state.sending || state.done || state.speciesId === null || !location) return
    dispatch({ type: 'SUBMIT_STARTED' })
    await Promise.all([
      submitSighting({
        speciesId: state.speciesId,
        x: location.x,
        y: location.y,
        street: location.shortStreet,
      }),
      new Promise((resolve) => setTimeout(resolve, SENDING_DELAY_MS)),
    ])
    dispatch({ type: 'SUBMIT_SUCCEEDED' })
  }

  if (state.done && state.speciesId !== null) {
    return (
      <Frame>
        <div
          className="pad center"
          style={{
            flexDirection: 'column',
            minHeight: '100%',
            textAlign: 'center',
            position: 'relative',
            gap: 16,
          }}
        >
          <PixelBurst />
          <div className="popin" style={{ zIndex: 2 }}>
            <CreatureSprite id={state.speciesId} scale={8} />
          </div>
          <div
            className="chip chip-good display"
            style={{ fontSize: 14, padding: '8px 16px', zIndex: 2 }}
          >
            +10 pts pendientes
          </div>
          <h2 className="display" style={{ fontSize: 18, margin: 0, zIndex: 2 }}>
            ¡Observación enviada!
          </h2>
          <p className="muted" style={{ margin: 0, maxWidth: 260, zIndex: 2 }}>
            {SUCCESS_MESSAGE}
          </p>
          <button
            className="btn btn-cta"
            style={{ maxWidth: 280, zIndex: 2 }}
            onClick={() => navigate('/mapa')}
          >
            Volver al mapa
          </button>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="pad stack" style={{ gap: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">Nuevo avistamiento</div>
            <div className="scr-title" style={{ fontSize: 18 }}>
              {STEP_TITLES[state.step]}
            </div>
          </div>
          <Link to="/mapa" aria-label="Cerrar" className="chip chip-ghost">
            ✕
          </Link>
        </div>

        {/* step indicator: completed segments navigate back without losing data */}
        <div className="row" style={{ gap: 6 }}>
          {([0, 1, 2, 3] as const).map((step) => (
            <button
              key={step}
              type="button"
              aria-label={`Paso ${step + 1}`}
              disabled={step >= state.step}
              onClick={() => dispatch({ type: 'STEP_SELECTED', step })}
              className="grow"
              style={{
                height: 6,
                borderRadius: 3,
                border: 'none',
                padding: 0,
                cursor: step < state.step ? 'pointer' : 'default',
                background: step <= state.step ? 'var(--accent)' : 'var(--line)',
              }}
            />
          ))}
        </div>

        {state.step === 0 && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="photo-ph" style={{ paddingTop: '92%', position: 'relative' }}>
              {!state.photoTaken ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {VIEWFINDER_CORNERS.map((corner, i) => (
                    <div key={i} style={cornerStyle(corner)} />
                  ))}
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span>visor · enfoca la criatura</span>
                </div>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CreatureSprite id="candadin" scale={6} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                    }}
                  >
                    foto · candado en vía pública
                  </span>
                </div>
              )}
            </div>

            <PrivacyNote />

            {!state.photoTaken ? (
              <button className="btn btn-accent" onClick={() => dispatch({ type: 'PHOTO_TAKEN' })}>
                ◉ Disparar foto
              </button>
            ) : (
              <div className="row" style={{ gap: 10 }}>
                <button className="btn" onClick={() => dispatch({ type: 'PHOTO_RETAKEN' })}>
                  ↺ Repetir
                </button>
                <button className="btn btn-cta" onClick={() => dispatch({ type: 'NEXT' })}>
                  ✓ Usar foto
                </button>
              </div>
            )}
          </div>
        )}

        {state.step === 1 && (
          <div className="stack" style={{ gap: 12 }}>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              ¿Qué has encontrado?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {species?.map((sp) => (
                <button
                  key={sp.id}
                  className="panel pad"
                  onClick={() => dispatch({ type: 'SPECIES_SELECTED', speciesId: sp.id })}
                  style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    borderColor: state.speciesId === sp.id ? 'var(--accent)' : 'var(--line)',
                    background: state.speciesId === sp.id ? 'var(--card2)' : 'var(--card)',
                  }}
                >
                  <CreatureSprite id={sp.id} scale={4} />
                  <span className="display" style={{ fontSize: 9 }}>
                    {sp.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="btn btn-cta"
              disabled={!isStepComplete(state, 1)}
              style={{ opacity: isStepComplete(state, 1) ? 1 : 0.45 }}
              onClick={() => dispatch({ type: 'NEXT' })}
            >
              ▸ Ubicación aproximada
            </button>
          </div>
        )}

        {state.step === 2 && state.speciesId !== null && (
          <div className="stack" style={{ gap: 12 }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
              <StreetMap
                pins={[
                  {
                    id: 'new',
                    speciesId: state.speciesId,
                    x: location?.x ?? 710,
                    y: location?.y ?? 225,
                    status: 'pending',
                  },
                ]}
              />
            </div>
            <div className="panel pad" style={{ padding: 14 }}>
              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 4 }}
              >
                UBICACIÓN APROXIMADA
              </div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{location?.street}</div>
            </div>
            <button
              className="panel pad"
              onClick={() => dispatch({ type: 'APPROX_TOGGLED' })}
              style={{
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  background: state.approxOnly ? 'var(--good)' : 'var(--line)',
                  border: 'var(--bw) solid var(--line)',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 1,
                    left: state.approxOnly ? 20 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left .15s',
                  }}
                />
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
                Por privacidad, guardamos solo una ubicación aproximada.
              </span>
            </button>
            <button className="btn btn-cta" onClick={() => dispatch({ type: 'NEXT' })}>
              ▸ Revisa y envía
            </button>
          </div>
        )}

        {state.step === 3 && state.speciesId !== null && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="panel pad" style={{ padding: 14, display: 'flex', gap: 14 }}>
              <div className="photo-ph center" style={{ width: 84, height: 84, flexShrink: 0 }}>
                <CreatureSprite id={state.speciesId} scale={4} />
              </div>
              <div className="grow stack" style={{ gap: 6, justifyContent: 'center' }}>
                <span className="display" style={{ fontSize: 12 }}>
                  {species?.find((sp) => sp.id === state.speciesId)?.name}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  {location?.shortStreet} · Ubicación aproximada
                </span>
                <span className="chip chip-warn" style={{ alignSelf: 'flex-start' }}>
                  Por verificar
                </span>
              </div>
            </div>
            <PrivacyNote />
            <button
              className="btn btn-accent"
              onClick={() => void submit()}
              disabled={state.sending}
            >
              {state.sending ? 'Enviando…' : '▲ Enviar al registro'}
            </button>
          </div>
        )}
      </div>
    </Frame>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="app-root mx-auto h-dvh max-w-md">
      <div className="screen" style={{ bottom: 0 }}>
        {children}
      </div>
    </div>
  )
}

function PrivacyNote() {
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

type Corner = { v: 'top' | 'bottom'; h: 'left' | 'right' }

const VIEWFINDER_CORNERS: Corner[] = [
  { v: 'top', h: 'left' },
  { v: 'top', h: 'right' },
  { v: 'bottom', h: 'left' },
  { v: 'bottom', h: 'right' },
]

function cornerStyle({ v, h }: Corner): CSSProperties {
  const style: CSSProperties = { position: 'absolute', width: 26, height: 26 }
  style[v] = 14
  style[h] = 14
  if (v === 'top') style.borderTop = '3px solid var(--accent2)'
  else style.borderBottom = '3px solid var(--accent2)'
  if (h === 'left') style.borderLeft = '3px solid var(--accent2)'
  else style.borderRight = '3px solid var(--accent2)'
  return style
}
