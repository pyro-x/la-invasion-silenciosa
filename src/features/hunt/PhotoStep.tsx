// Real photo step (LCHP-14, D-050): in-app getUserMedia viewfinder as the
// primary capture, native camera input + gallery picker as the always-works
// fallback (iOS viewfinder startup measured at 1.4–5.4 s in the LCHP-5
// spike). Every source goes through processPhoto — nothing leaves the device
// without the resize + EXIF-strip pipeline.
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { CAMERA_CONSTRAINTS, cameraDenialGuidance } from '@/lib/permissions'
import { PhotoError, processPhoto } from '@/lib/photo'
import { PrivacyNote } from './PrivacyNote'
import type { CapturePhoto } from './captureFlow'

type Props = {
  photo: CapturePhoto | null
  /** Open the viewfinder on mount (permission already granted or primed). */
  autoStart: boolean
  /** Hands over the gate's live camera stream at most once; null otherwise. */
  takePrimedStream: () => MediaStream | null
  onPhotoReady: (photo: CapturePhoto) => void
  onRetake: () => void
  onConfirm: () => void
}

type CameraState = 'idle' | 'starting' | 'live'

function photoErrorMessage(error: PhotoError | null): string {
  switch (error?.reason) {
    case 'too_large':
      return 'La foto pesa demasiado incluso comprimida. Prueba con otra.'
    case 'decode_failed':
      return 'No se pudo leer esa imagen. Prueba con otra.'
    default:
      return 'No se pudo procesar la foto, inténtalo de nuevo.'
  }
}

export function PhotoStep({
  photo,
  autoStart,
  takePrimedStream,
  onPhotoReady,
  onRetake,
  onConfirm,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const autoStartAttempted = useRef(false)
  const [camera, setCamera] = useState<CameraState>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCamera('idle')
  }

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    },
    [],
  )

  useEffect(() => {
    if (camera === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [camera])

  // Frictionless entry (LCHP-28): when the gate just granted the camera, its
  // live stream is handed straight to the viewfinder; when permission was
  // already granted (no gate), the viewfinder opens silently — a failure just
  // leaves the normal buttons, since the user didn't act yet.
  useEffect(() => {
    if (autoStartAttempted.current || photo || !autoStart) return
    autoStartAttempted.current = true
    void startCamera(true)
  })

  async function startCamera(silent = false) {
    setError(null)
    const primed = takePrimedStream()
    if (primed) {
      streamRef.current = primed
      setCamera('live')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!silent) {
        setError('Este navegador no soporta el visor — usa la cámara del sistema o la galería.')
      }
      return
    }
    setCamera('starting')
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
      setCamera('live')
    } catch {
      setCamera('idle')
      if (!silent) setError(cameraDenialGuidance())
    }
  }

  async function processSource(source: Blob) {
    setBusy(true)
    setError(null)
    try {
      const clean = await processPhoto(source)
      onPhotoReady({ blob: clean, previewUrl: URL.createObjectURL(clean) })
    } catch (e) {
      setError(photoErrorMessage(e instanceof PhotoError ? e : null))
    } finally {
      setBusy(false)
    }
  }

  async function captureFrame() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const frame = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    stopCamera()
    if (!frame) {
      setError('No se pudo capturar la imagen, inténtalo de nuevo.')
      return
    }
    await processSource(frame)
  }

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Allow re-picking the same file after a retake.
    event.target.value = ''
    if (file) void processSource(file)
  }

  if (photo) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        <div className="photo-ph" style={{ paddingTop: '92%', position: 'relative' }}>
          <img
            src={photo.previewUrl}
            alt="Foto del avistamiento"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
        <PrivacyNote />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={onRetake}>
            ↺ Repetir
          </button>
          <button className="btn btn-cta" onClick={onConfirm}>
            ✓ Usar foto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="photo-ph" style={{ paddingTop: '92%', position: 'relative' }}>
        {camera === 'live' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
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
            <span>{busy ? 'procesando foto…' : 'enfoca la criatura'}</span>
          </div>
        )}
      </div>

      <PrivacyNote />

      {error && (
        <div className="panel pad" style={{ padding: 12, fontSize: 12.5, color: 'var(--bad)' }}>
          {error}
        </div>
      )}

      {camera === 'live' ? (
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={stopCamera}>
            ✕ Cerrar visor
          </button>
          <button className="btn btn-accent" onClick={() => void captureFrame()} disabled={busy}>
            ◉ Disparar
          </button>
        </div>
      ) : (
        <>
          <button
            className="btn btn-accent"
            onClick={() => void startCamera()}
            disabled={busy || camera === 'starting'}
          >
            {camera === 'starting' ? 'Abriendo cámara…' : '◉ Abrir visor'}
          </button>
          <div className="row" style={{ gap: 10 }}>
            <label className="btn grow" style={{ cursor: 'pointer' }}>
              📷 Cámara del sistema
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileChosen}
                disabled={busy}
                style={{ display: 'none' }}
              />
            </label>
            <label className="btn grow" style={{ cursor: 'pointer' }}>
              🖼 Galería
              <input
                type="file"
                accept="image/*"
                onChange={onFileChosen}
                disabled={busy}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </>
      )}
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
