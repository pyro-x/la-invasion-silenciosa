// Press-start screen: replica of the prototype's StartScreen (screens1.jsx).
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { shouldShowOnboarding } from '@/lib/onboarding'
import logoChispera from '@/assets/logo-chispera.png'

const MOBILE_MAX_WIDTH = 540

// TODO(LCHP-5): best-effort hook until the spike settles fullscreen support
// (iOS Safari is expected to reject it; Android Chrome honors it).
function requestFullscreen() {
  const element = document.documentElement
  if (!element.requestFullscreen) return
  try {
    element.requestFullscreen().catch(() => {})
  } catch {
    // vendor quirks: some engines throw synchronously instead of rejecting
  }
}

export function HomePage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const [mobile] = useState(() => window.innerWidth <= MOBILE_MAX_WIDTH)

  function handleStart() {
    if (mobile) requestFullscreen()
    navigate(shouldShowOnboarding(search) ? '/onboarding' : '/mapa')
  }

  return (
    <div className="app-root mx-auto h-dvh max-w-md">
      <div
        className="screen"
        style={{
          bottom: 0,
          zIndex: 88,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 28,
          gap: 18,
        }}
      >
        <span className="chip chip-accent" style={{ position: 'absolute', top: 22 }}>
          Misión de barrio
        </span>
        <div
          className="floaty center"
          style={{
            width: 132,
            height: 132,
            borderRadius: '50%',
            overflow: 'hidden',
            border: 'var(--bw) solid var(--line)',
            background: 'var(--card)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <img
            src={logoChispera}
            alt=""
            style={{ width: '88%', height: '88%', objectFit: 'contain' }}
          />
        </div>
        <div>
          <h1 className="display" style={{ fontSize: 27, lineHeight: 1.18, margin: '6px 0 8px' }}>
            La Invasión Silenciosa
          </h1>
          <p
            className="mono"
            style={{ fontSize: 11.5, letterSpacing: '0.04em', color: 'var(--accent2)', margin: 0 }}
          >
            Cazadores de turistificación · La Latina
          </p>
        </div>
        <button
          className="btn btn-cta"
          style={{ maxWidth: 300, marginTop: 6, fontSize: 14 }}
          onClick={handleStart}
        >
          ▶ Empezar la misión
        </button>
        {mobile && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            se abrirá a pantalla completa
          </span>
        )}
        <span
          className="mono"
          style={{ position: 'absolute', bottom: 18, fontSize: 10, color: 'var(--ink-dim)' }}
        >
          A.V. La Chispera · Madrid
        </span>
      </div>
    </div>
  )
}
