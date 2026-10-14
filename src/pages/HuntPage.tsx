// 4-step capture flow against the real backend (LCHP-14): processed photo →
// species → map position → POST /create-sighting. A failed submit keeps every
// collected field (retry is pressing send again); success invalidates the map
// query so the new pending marker blinks on return. The equipment gate
// (LCHP-28, LCHP-54) is the door: it shows whenever the camera is not granted
// or there is no position yet, one tap asks for both, and the flow opens once
// the camera has answered and the watch has a position. The watch then runs
// for the whole flow (the location step reads it live) and stops on leave.
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { PixelBurst } from '@/components/pixel/PixelBurst'
import {
  captureFlowReducer,
  initialCaptureFlowState,
  isStepComplete,
} from '@/features/hunt/captureFlow'
import { EquipmentGate } from '@/features/hunt/EquipmentGate'
import { LocationStep } from '@/features/hunt/LocationStep'
import { PhotoStep } from '@/features/hunt/PhotoStep'
import { whyNotSend } from '@/features/hunt/presence'
import { PrivacyNote } from '@/features/hunt/PrivacyNote'
import { resumeGeoWatchIfGranted, startGeoWatch, stopGeoWatch, useGeoWatch } from '@/lib/geoWatch'
import { CAMERA_CONSTRAINTS, cameraPermissionState, type CameraPermission } from '@/lib/permissions'
import { submitSighting } from '@/services/sightings.service'
import { listSpecies } from '@/services/species.service'

const STEP_TITLES = [
  'Captura la criatura',
  'Identifica la especie',
  '¿Dónde está la criatura?',
  'Revisa y envía',
]

// Brief §4: points are never shown as definitive before community validation.
const SUCCESS_MESSAGE = 'Avistamiento enviado · +10 puntos pendientes de validación'

const NETWORK_ERROR_MESSAGE = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.'

const CAMERA_WAIT_MS = 15_000

export function HuntPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(captureFlowReducer, initialCaptureFlowState)
  const { data: species } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  // The door (LCHP-28, LCHP-54): the camera permission is read once (reliable
  // in the Permissions API; Android remembers, iOS Safari re-asks per
  // session) and the watch resumes on arrival only when the browser says it
  // will not ask (as /mapa does). The gate shows until both are in hand, and
  // once passed it stays passed: a position lost later is the location
  // step's notice, not a door closing mid-photo. The primed stream lives in
  // a ref — it is a live resource, not render state.
  const geo = useGeoWatch()
  const [camera, setCamera] = useState<CameraPermission | null>(null)
  const [resumed, setResumed] = useState(false)
  const [arming, setArming] = useState(false)
  const [cameraArmed, setCameraArmed] = useState(false)
  // The tap started the watch: its answer may be a denial, so the door
  // waits for it. A watch resumed on arrival was already granted.
  const [askedForPosition, setAskedForPosition] = useState(false)
  const [passed, setPassed] = useState(false)
  const [autoStartCamera, setAutoStartCamera] = useState(false)
  const primedStreamRef = useRef<MediaStream | null>(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    void cameraPermissionState().then((state) => {
      if (!aliveRef.current) return
      setCamera(state)
      if (state === 'granted') setAutoStartCamera(true)
    })
    void resumeGeoWatchIfGranted().then(() => {
      if (aliveRef.current) setResumed(true)
    })
  }, [])

  const checked = camera !== null && resumed
  const cameraReady = camera === 'granted' || cameraArmed
  const waitingForFix = geo.kind === 'searching' && askedForPosition
  const located = geo.kind === 'ok' || (geo.kind === 'searching' && !askedForPosition)
  const equipped = cameraReady && located
  if (checked && equipped && !passed) setPassed(true)

  // One gesture, both prompts, fired synchronously within the tap (Safari's
  // transient activation must cover both). The watch is started only when it
  // is not already running; the camera only when it is not already granted.
  // The stream waits in its ref until the first position opens the flow;
  // it is released if the position is refused, and on leave.
  function armEquipment() {
    if (geo.kind !== 'ok' && geo.kind !== 'searching') {
      setAskedForPosition(true)
      startGeoWatch()
    }
    if (cameraReady || arming) return
    setArming(true)
    // A request the browser never answers must not hold the door shut:
    // after the limit the system camera and the gallery take over (D-050).
    // getUserMedia cannot be cancelled, so a stream granted after the limit
    // is stopped on arrival: nobody is waiting for it any more.
    const request: Promise<MediaStream | null> = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS).catch(() => null)
      : Promise.resolve(null)
    let gaveUp = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        gaveUp = true
        resolve(null)
      }, CAMERA_WAIT_MS)
    })
    void request.then((stream) => {
      clearTimeout(timer)
      if (gaveUp) stream?.getTracks().forEach((track) => track.stop())
    })
    void Promise.race([request, deadline]).then((stream) => {
      if (!aliveRef.current) {
        stream?.getTracks().forEach((track) => track.stop())
        return
      }
      primedStreamRef.current = stream
      setAutoStartCamera(true)
      setArming(false)
      setCameraArmed(true)
    })
  }

  // A stream granted while the position is refused would keep the camera
  // light on behind the guidance: it is released, and the viewfinder opens
  // again by itself once the door passes (the permission is already given).
  const refused =
    geo.kind === 'denied' ||
    geo.kind === 'unavailable' ||
    geo.kind === 'timeout' ||
    geo.kind === 'unsupported'
  useEffect(() => {
    if (passed || !refused) return
    primedStreamRef.current?.getTracks().forEach((track) => track.stop())
    primedStreamRef.current = null
  }, [passed, refused])

  function takePrimedStream(): MediaStream | null {
    const stream = primedStreamRef.current
    primedStreamRef.current = null
    return stream
  }

  // The preview object URL, an unconsumed primed stream and the watch all
  // outlive React state; release them on unmount.
  const previewUrlRef = useRef<string | null>(null)
  useEffect(() => {
    previewUrlRef.current = state.photo?.previewUrl ?? null
  })
  useEffect(() => {
    // StrictMode runs this setup again after a simulated unmount: revive.
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      primedStreamRef.current?.getTracks().forEach((track) => track.stop())
      primedStreamRef.current = null
      stopGeoWatch()
    }
  }, [])

  // The rule of step 3 holds until the send: a neighbour who walked away
  // from the pin, or whose position was lost meanwhile, is told so here.
  const me = geo.kind === 'ok' ? geo.position : null
  const sendBlock = state.step === 3 && state.position ? whyNotSend(me, state.position) : null

  async function submit() {
    if (state.sending || state.done || sendBlock) return
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

  const showGate = checked && !passed && !equipped && state.step === 0 && !state.done

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
        {!showGate && (
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
        )}

        {showGate && (
          <EquipmentGate
            geo={geo}
            cameraReady={cameraReady}
            located={located}
            waitingForFix={waitingForFix}
            arming={arming}
            onArm={armEquipment}
          />
        )}

        {!showGate && checked && state.step === 0 && (
          <PhotoStep
            photo={state.photo}
            autoStart={autoStartCamera}
            takePrimedStream={takePrimedStream}
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
              ▸ Sitúala en el mapa
            </button>
          </div>
        )}

        {state.step === 2 && (
          <LocationStep
            position={state.position}
            geo={geo}
            onPositionChanged={(position) => dispatch({ type: 'POSITION_CHANGED', position })}
            onLocate={startGeoWatch}
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
            {sendBlock && (
              <div
                className="panel panel-2 pad stack"
                role="note"
                style={{ padding: 12, gap: 10, fontSize: 12.5, color: 'var(--ink-dim)' }}
              >
                <span>{sendBlock}</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => dispatch({ type: 'STEP_SELECTED', step: 2 })}
                >
                  ◂ Volver a situarla
                </button>
              </div>
            )}
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
              disabled={state.sending || sendBlock !== null}
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
