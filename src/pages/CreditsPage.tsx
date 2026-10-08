// Credits and licences (LCHP-33, D-059). The map shows only the data credit
// it must show; the basemap style's design credit and its licence texts
// live here, reachable from Perfil. The texts are the vendored upstream
// files, so this page and the source notices cannot drift apart.
import { useNavigate } from 'react-router'
import openFreeMapStylesLicense from '@/components/map/styles/OPENFREEMAP-STYLES-LICENSE.md?raw'
import positronLicense from '@/components/map/styles/POSITRON-LICENSE.md?raw'

const linkStyle = { color: 'var(--accent)', textDecoration: 'underline' }

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {children}
    </a>
  )
}

export function CreditsPage() {
  const navigate = useNavigate()
  return (
    <div className="screen">
      <div className="pad stack" style={{ gap: 14 }}>
        <button
          className="chip chip-ghost"
          onClick={() => navigate('/perfil')}
          style={{ alignSelf: 'flex-start' }}
        >
          ← Perfil
        </button>
        <div>
          <div className="eyebrow">Sobre la app</div>
          <h1 className="scr-title" style={{ fontSize: 20 }}>
            Créditos y licencias
          </h1>
        </div>

        <section className="panel pad stack" style={{ padding: 14, gap: 8 }}>
          <h2 className="display" style={{ fontSize: 12 }}>
            Datos del mapa
          </h2>
          <p style={{ fontSize: 13 }}>
            Datos del mapa ©{' '}
            <ExternalLink href="https://www.openstreetmap.org/copyright">
              colaboradores de OpenStreetMap
            </ExternalLink>
            , disponibles bajo la Open Database License (ODbL).
          </p>
          <p style={{ fontSize: 13 }}>
            Teselas vectoriales con el esquema{' '}
            <ExternalLink href="https://openmaptiles.org/">© OpenMapTiles</ExternalLink>, servidas
            por <ExternalLink href="https://openfreemap.org/">OpenFreeMap</ExternalLink>.
          </p>
        </section>

        <section className="panel pad stack" style={{ padding: 14, gap: 8 }}>
          <h2 className="display" style={{ fontSize: 12 }}>
            Estilo del mapa
          </h2>
          <p style={{ fontSize: 13 }}>
            El estilo «chispera» deriva de{' '}
            <ExternalLink href="https://github.com/openmaptiles/positron-gl-style">
              Positron
            </ExternalLink>{' '}
            (© MapTiler.com y colaboradores de OpenMapTiles, © CartoDB Inc.), a su vez derivado de
            CartoDB Basemaps, diseñado por Stamen y Paul Norman para CartoDB Inc. Diseño bajo
            licencia{' '}
            <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">
              CC BY 4.0
            </ExternalLink>
            ; hemos cambiado la paleta y las etiquetas. Código bajo licencia BSD de 3 cláusulas.
            Partimos de la adaptación de{' '}
            <ExternalLink href="https://github.com/hyperknot/openfreemap-styles">
              OpenFreeMap
            </ExternalLink>{' '}
            (© 2023 Zsolt Ero, licencia MIT).
          </p>
          <details>
            <summary className="mono" style={{ fontSize: 11, cursor: 'pointer' }}>
              Texto completo de la licencia de Positron
            </summary>
            <pre
              className="mono"
              style={{
                fontSize: 10,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                color: 'var(--ink-dim)',
                marginTop: 8,
              }}
            >
              {positronLicense}
            </pre>
          </details>
          <details>
            <summary className="mono" style={{ fontSize: 11, cursor: 'pointer' }}>
              Licencias de los estilos de OpenFreeMap
            </summary>
            <pre
              className="mono"
              style={{
                fontSize: 10,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                color: 'var(--ink-dim)',
                marginTop: 8,
              }}
            >
              {openFreeMapStylesLicense}
            </pre>
          </details>
        </section>

        <section className="panel pad stack" style={{ padding: 14, gap: 8 }}>
          <h2 className="display" style={{ fontSize: 12 }}>
            Motor del mapa
          </h2>
          <p style={{ fontSize: 13 }}>
            <ExternalLink href="https://maplibre.org/">MapLibre GL JS</ExternalLink> (BSD de 3
            cláusulas). Tipografía de las etiquetas: Noto Sans (SIL Open Font License 1.1).
          </p>
        </section>
      </div>
    </div>
  )
}
