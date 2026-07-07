// «Guarda tu cuenta» (LCHP-29, D-055): the permanent passive floor in Perfil
// and the panel every LCHP-30 invitation opens. Email → 6-digit code → same
// account, upgraded. The anonymous session stays fully usable while a code
// is pending — a late or never-typed code must be harmless.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Toast } from '@/components/ui/Toast'
import { confirmUpgrade, registrationState, requestUpgrade } from '@/lib/registration'

type View =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'code'; email: string }
  | { kind: 'registered'; email: string }

const REQUEST_ERRORS: Record<string, string> = {
  email_taken:
    'Ese correo ya tiene una cuenta aquí. Si es tuyo, entra desde ese dispositivo — o usa otro correo.',
  invalid_email: 'Ese correo no parece válido, revísalo.',
  rate_limited: 'Demasiados intentos. Espera un poco antes de pedir otro código.',
  error: 'No se pudo enviar el código, inténtalo de nuevo.',
}

const CONFIRM_ERRORS: Record<string, string> = {
  bad_code: 'Ese código no es válido o ha caducado. Revísalo o pide otro.',
  rate_limited: 'Demasiados intentos. Espera un poco y vuelve a probar.',
  error: 'No se pudo confirmar, inténtalo de nuevo.',
}

export function RegistrationPanel({
  onRegistered,
}: {
  /** Fires after a successful upgrade (LCHP-30 closes its modal with this). */
  onRegistered?: (pointsRecovered: number) => void
}) {
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let alive = true
    void registrationState().then((state) => {
      if (!alive) return
      if (state.kind === 'pending') setView({ kind: 'code', email: state.email })
      else setView(state)
    })
    return () => {
      alive = false
      clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    const target = email.trim()
    if (!target) return
    setBusy(true)
    setError(null)
    const result = await requestUpgrade(target)
    setBusy(false)
    if (result.kind === 'sent') {
      setView({ kind: 'code', email: result.email })
      setCode('')
      return
    }
    setError(REQUEST_ERRORS[result.kind])
  }

  async function resendCode(target: string) {
    setBusy(true)
    setError(null)
    const result = await requestUpgrade(target)
    setBusy(false)
    if (result.kind === 'sent') showToast('Código reenviado')
    else setError(REQUEST_ERRORS[result.kind])
  }

  async function confirmCode(event: FormEvent, target: string) {
    event.preventDefault()
    const token = code.trim()
    if (!token) return
    setBusy(true)
    setError(null)
    const result = await confirmUpgrade(target, token)
    setBusy(false)
    if (result.kind === 'registered') {
      setView({ kind: 'registered', email: target })
      showToast(
        result.pointsRecovered > 0
          ? `Cuenta guardada 🎉 · +${result.pointsRecovered} puntos recuperados`
          : 'Cuenta guardada 🎉',
      )
      onRegistered?.(result.pointsRecovered)
      return
    }
    setError(CONFIRM_ERRORS[result.kind])
  }

  if (view.kind === 'loading') return null

  return (
    <div className="panel pad" style={{ padding: 14, position: 'relative' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Guarda tu cuenta
      </div>

      {view.kind === 'registered' && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="chip chip-good">✓ Cuenta guardada</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              {view.email}
            </span>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
            Tus puntos y tus cazas te siguen a cualquier móvil.
          </span>
        </div>
      )}

      {view.kind === 'anonymous' && (
        <form className="stack" style={{ gap: 10 }} onSubmit={(e) => void sendCode(e)}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
            Tus puntos viven solo en este navegador: si cambias de móvil o lo limpias, se pierden.
            Guárdalos con tu correo — sin contraseña.
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            aria-label="Tu correo"
            autoComplete="email"
            className="panel-2"
            style={{
              border: 'var(--bw) solid var(--line)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 14,
              background: 'var(--bg2)',
              color: 'var(--ink)',
            }}
          />
          <button className="btn btn-accent" type="submit" disabled={busy || !email.trim()}>
            {busy ? 'Enviando…' : '📮 Enviarme un código'}
          </button>
        </form>
      )}

      {view.kind === 'code' && (
        <form
          className="stack"
          style={{ gap: 10 }}
          onSubmit={(e) => void confirmCode(e, view.email)}
        >
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
            Te hemos enviado un código a{' '}
            <strong style={{ color: 'var(--ink)' }}>{view.email}</strong>. Escríbelo aquí. ¿No
            llega? Mira en la carpeta de spam.
          </span>
          {/* 6 digits is the target config (D-056), but the input tolerates 8
              so a deploy that outruns the hosted otp_length change can never
              strand a neighbor mid-registration (Codex review, HIGH). */}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-label="Código del correo"
            className="mono"
            style={{
              border: 'var(--bw) solid var(--line)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 20,
              letterSpacing: '0.35em',
              textAlign: 'center',
              background: 'var(--bg2)',
              color: 'var(--ink)',
            }}
          />
          <button className="btn btn-accent" type="submit" disabled={busy || code.length < 6}>
            {busy ? 'Comprobando…' : '✓ Confirmar código'}
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn grow"
              type="button"
              disabled={busy}
              onClick={() => void resendCode(view.email)}
            >
              ↺ Reenviar código
            </button>
            <button
              className="btn grow"
              type="button"
              disabled={busy}
              onClick={() => {
                setView({ kind: 'anonymous' })
                setError(null)
              }}
            >
              ✎ Cambiar correo
            </button>
          </div>
        </form>
      )}

      {error && (
        <div
          className="panel panel-2 pad"
          style={{ padding: 10, marginTop: 10, fontSize: 12, color: 'var(--bad)' }}
        >
          {error}
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
