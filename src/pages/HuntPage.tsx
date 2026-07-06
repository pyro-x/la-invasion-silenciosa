// 4-step capture flow against the real backend (LCHP-14): processed photo →
// species → map position → POST /create-sighting. A failed submit keeps every
// collected field (retry is pressing send again); success invalidates the map
// query so the new pending marker blinks on return.
import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { PixelBurst } from '@/components/pixel/PixelBurst'
import {
  captureFlowReducer,
  initialCaptureFlowState,
  isStepComplete,
} from '@/features/hunt/captureFlow'
import { LocationStep } from '@/features/hunt/LocationStep'
import { PhotoStep } from '@/features/hunt/PhotoStep'
import { PrivacyNote } from '@/features/hunt/PrivacyNote'
import { submitSighting } from '@/services/sightings.service'
import { listSpecies } from '@/services/species.service'

const STEP_TITLES = [
  'Captura la criatura',
  'Identifica la especie',
  'Ubicación aproximada',
  'Revisa y envía',
]

// Brief §4: points are never shown as definitive before community validation.
const SUCCESS_MESSAGE = 'Avistamiento enviado · +10 puntos pendientes de validación'

const NETWORK_ERROR_MESSAGE = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.'

export function HuntPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(captureFlowReducer, initialCaptureFlowState)
  const { data: species } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  // The preview object URL outlives React state; release it on unmount.
  const previewUrlRef = useRef<string | null>(null)
  useEffect(() => {
    previewUrlRef.current = state.photo?.previewUrl ?? null
  })
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  async function submit() {
    if (state.sending || state.done) return
    if (!state.photo || state.speciesId === null || !state.position) return
    dispatch({ type: 'SUBMIT_STARTED' })
    const result = await submitSighting({
      speciesId: state.speciesId,
      photo: state.photo.blob,
      lat: state.position.lat,
      lng: state.position.lng,
      accuracyM: state.position.accuracyM,
    })
    if (result.kind === 'created') {
      void queryClient.invalidateQueries({ queryKey: ['sightings', 'map'] })
      dispatch({ type: 'SUBMIT_SUCCEEDED' })
      return
    }
    dispatch({
      type: 'SUBMIT_FAILED',
      message: result.kind === 'rejected' ? result.message : NETWORK_ERROR_MESSAGE,
    })
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
          <PhotoStep
            photo={state.photo}
            onPhotoReady={(photo) => dispatch({ type: 'PHOTO_READY', photo })}
            onRetake={() => {
              if (state.photo) URL.revokeObjectURL(state.photo.previewUrl)
              dispatch({ type: 'PHOTO_CLEARED' })
            }}
            onConfirm={() => dispatch({ type: 'NEXT' })}
          />
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

        {state.step === 2 && (
          <LocationStep
            position={state.position}
            approxOnly={state.approxOnly}
            onPositionChanged={(position) => dispatch({ type: 'POSITION_CHANGED', position })}
            onApproxToggled={() => dispatch({ type: 'APPROX_TOGGLED' })}
            onNext={() => dispatch({ type: 'NEXT' })}
          />
        )}

        {state.step === 3 && state.speciesId !== null && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="panel pad" style={{ padding: 14, display: 'flex', gap: 14 }}>
              <div
                className="photo-ph center"
                style={{
                  width: 84,
                  height: 84,
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {state.photo ? (
                  <img
                    src={state.photo.previewUrl}
                    alt="Foto del avistamiento"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <CreatureSprite id={state.speciesId} scale={4} />
                )}
              </div>
              <div className="grow stack" style={{ gap: 6, justifyContent: 'center' }}>
                <span className="display" style={{ fontSize: 12 }}>
                  {species?.find((sp) => sp.id === state.speciesId)?.name}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  La Latina · Ubicación aproximada
                </span>
                <span className="chip chip-warn" style={{ alignSelf: 'flex-start' }}>
                  Por verificar
                </span>
              </div>
            </div>
            <PrivacyNote />
            {state.submitError && (
              <div
                className="panel pad"
                role="alert"
                style={{ padding: 12, fontSize: 12.5, color: 'var(--bad)' }}
              >
                {state.submitError}
              </div>
            )}
            <button
              className="btn btn-accent"
              onClick={() => void submit()}
              disabled={state.sending}
            >
              {state.sending
                ? 'Enviando…'
                : state.submitError
                  ? '⟳ Reintentar'
                  : '▲ Enviar al registro'}
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
