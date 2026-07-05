// Mission briefing: replica of the prototype's Onboarding (screens1.jsx).
// Golden-rule copy follows reglas-y-especificacion.md §3.1 (D-020).
import { useNavigate } from 'react-router'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { markOnboardingSeen } from '@/lib/onboarding'
import logoChispera from '@/assets/logo-chispera.png'

export function OnboardingPage() {
  const navigate = useNavigate()

  function handleAccept() {
    markOnboardingSeen()
    navigate('/mapa')
  }

  return (
    <div className="app-root mx-auto h-dvh max-w-md">
      <div
        className="screen"
        style={{ bottom: 0, zIndex: 70, display: 'flex', flexDirection: 'column' }}
      >
        <div
          className="pad stack"
          style={{ gap: 16, paddingTop: 24, minHeight: '100%', justifyContent: 'space-between' }}
        >
          <div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="chip chip-accent">Misión de barrio</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                LA LATINA · MAD
              </span>
            </div>

            <div
              className="center"
              style={{ gap: 16, margin: '20px 0 6px', justifyContent: 'space-around' }}
            >
              <CreatureSprite id="candadin" scale={5} style={{ animationDelay: '0s' }} />
              <div className="floaty">
                <CreatureSprite id="keymon" scale={6} />
              </div>
              <CreatureSprite id="turistox" scale={5} />
            </div>

            <h1
              className="display"
              style={{ fontSize: 26, lineHeight: 1.25, margin: '12px 0 6px', color: 'var(--ink)' }}
            >
              La Invasión Silenciosa
            </h1>
            <p
              className="mono"
              style={{
                fontSize: 11.5,
                letterSpacing: '0.04em',
                color: 'var(--accent2)',
                margin: 0,
              }}
            >
              Cazadores de turistificación · La Latina
            </p>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13,
                lineHeight: 1.45,
                fontStyle: 'italic',
                color: 'var(--accent)',
              }}
            >
              Como las chisperas que plantaron cara en 1808, hoy defendemos el barrio. Salta la
              chispa.
            </p>
          </div>

          <div className="panel pad slidein" style={{ padding: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.5 }}>
              Se está produciendo una invasión silenciosa en la ciudad. Los vecinos de La Latina
              necesitan ayuda para registrar los indicios visibles de la turistificación.
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-dim)' }}>
              Tenemos una misión para ti, explorador urbano: encuentra a las criaturas, regístralas
              y suma puntos para conseguir premios.
            </p>
          </div>

          <div className="panel panel-2 pad" style={{ padding: 14, borderStyle: 'dashed' }}>
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span className="display" style={{ fontSize: 11, color: 'var(--accent)' }}>
                Regla de oro
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink-dim)' }}>
              Documenta criaturas, nunca personas. Prohibido fotografiar huéspedes, porteros,
              vecinos o trabajadores, información privada o matrículas.
            </p>
          </div>

          <div className="row" style={{ gap: 12, alignItems: 'center', padding: '2px 4px' }}>
            <div
              className="center"
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--card)',
                border: 'var(--bw) solid var(--line)',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <img
                src={logoChispera}
                alt="A.V. La Chispera"
                style={{ width: 44, height: 44, objectFit: 'contain' }}
              />
            </div>
            <div className="grow">
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Una iniciativa vecinal
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>A.V. La Chispera · Madrid</div>
            </div>
          </div>

          <button className="btn btn-cta" onClick={handleAccept} style={{ marginTop: 2 }}>
            ▸ Aceptar la misión
          </button>
        </div>
      </div>
    </div>
  )
}
