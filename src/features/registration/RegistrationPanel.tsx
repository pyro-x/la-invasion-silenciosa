// «Guarda tu cuenta» (LCHP-29, D-055, D-060): the permanent passive floor in
// Perfil and the panel every LCHP-30 invitation opens. Email → confirmation
// link → same account, upgraded. The link may open in another browser (an
// installed iOS PWA and Safari do not share storage), so this panel never
// waits for a redirect: it asks the server whenever the neighbor is back.
// The anonymous session stays fully usable while a link is pending — a late
// or never-opened link must be harmless.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Toast } from '@/components/ui/Toast'
import {
  checkUpgrade,
  registrationState,
  requestUpgrade,
  upgradeRequestedHere,
} from '@/lib/registration'

type View =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'link'; email: string }
  | { kind: 'registered'; email: string }

const REQUEST_ERRORS: Record<string, string> = {
  email_taken:
    'Ese correo ya tiene una cuenta aquí. Si es tuyo, entra desde ese dispositivo — o usa otro correo.',
  invalid_email: 'Ese correo no parece válido, revísalo.',
  rate_limited: 'Demasiados intentos. Espera un poco antes de pedir otro enlace.',
  error: 'No se pudo enviar el enlace, inténtalo de nuevo.',
}

const NOT_YET = 'Aún no nos consta. Abre el enlace del correo y vuelve aquí.'
const CHECK_FAILED = 'No se pudo comprobar, inténtalo de nuevo.'

export function RegistrationPanel({
  onRegistered,
}: {
  /** Fires after a successful upgrade (LCHP-30 closes its modal with this). */
  onRegistered?: (pointsRecovered: number) => void
}) {
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onRegisteredRef = useRef(onRegistered)
  const checking = useRef(false)

  useEffect(() => {
    onRegisteredRef.current = onRegistered
  })

  const showToast = useCallback((message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  // `quiet` checks run by themselves (on mount, on coming back to the app)
  // and say nothing when the link is still unopened.
  const check = useCallback(
    async (quiet: boolean) => {
      if (checking.current) return
      checking.current = true
      if (!quiet) {
        setBusy(true)
        setError(null)
      }
      const result = await checkUpgrade()
      checking.current = false
      if (!quiet) setBusy(false)
      if (result.kind === 'registered') {
        setError(null)
        setView({ kind: 'registered', email: result.email })
        showToast(
          result.pointsRecovered > 0
            ? `Cuenta guardada 🎉 · +${result.pointsRecovered} puntos recuperados`
            : 'Cuenta guardada 🎉',
        )
        onRegisteredRef.current?.(result.pointsRecovered)
        return
      }
      if (!quiet) setError(result.kind === 'pending' ? NOT_YET : CHECK_FAILED)
    },
    [showToast],
  )

  useEffect(() => {
    let alive = true
    void registrationState().then((state) => {
      if (!alive) return
      if (state.kind === 'pending') {
        setView({ kind: 'link', email: state.email })
        void check(true)
        return
      }
      setView(state)
      // The link opened in this same browser: the session arrived already
      // upgraded, and the request marker says it has not been celebrated.
      if (state.kind === 'registered' && upgradeRequestedHere()) void check(true)
    })
    return () => {
      alive = false
      clearTimeout(toastTimer.current)
    }
  }, [check])

  const waitingForLink = view.kind === 'link'
  useEffect(() => {
    if (!waitingForLink) return
    const onReturn = () => {
      if (document.visibilityState === 'visible') void check(true)
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [waitingForLink, check])

  async function sendLink(event?: FormEvent) {
    event?.preventDefault()
    const target = email.trim()
    if (!target) return
    setBusy(true)
    setError(null)
    const result = await requestUpgrade(target)
    setBusy(false)
    if (result.kind === 'sent') {
      setView({ kind: 'link', email: result.email })
      return
    }
    setError(REQUEST_ERRORS[result.kind])
  }

  async function resendLink(target: string) {
    setBusy(true)
    setError(null)
    const result = await requestUpgrade(target)
    setBusy(false)
    if (result.kind === 'sent') showToast('Enlace reenviado')
    else setError(REQUEST_ERRORS[result.kind])
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
        <form className="stack" style={{ gap: 10 }} onSubmit={(e) => void sendLink(e)}>
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
            {busy ? 'Enviando…' : '📮 Enviarme el enlace'}
          </button>
        </form>
      )}

      {view.kind === 'link' && (
        <div className="stack" style={{ gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
            Te hemos enviado un enlace a{' '}
            <strong style={{ color: 'var(--ink)' }}>{view.email}</strong>. Ábrelo para confirmar tu
            correo y <strong style={{ color: 'var(--ink)' }}>vuelve a esta pantalla</strong>: tu
            cuenta se guarda aquí, da igual dónde se abra el enlace.
          </span>
          {/* The hosted project cannot customise this email on the free tier
              (D-060), so say what to look for. */}
          <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
            El correo llega en inglés, de «Supabase Auth», con el asunto «Confirm your new email
            address». ¿No llega? Mira en la carpeta de spam.
          </span>
          <button
            className="btn btn-accent"
            type="button"
            disabled={busy}
            onClick={() => void check(false)}
          >
            {busy ? 'Comprobando…' : '✓ Ya lo he abierto'}
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn grow"
              type="button"
              disabled={busy}
              onClick={() => void resendLink(view.email)}
            >
              ↺ Reenviar enlace
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
        </div>
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
