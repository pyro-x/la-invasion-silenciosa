// Species detail card ported from the prototype (screens2.jsx
// CreatureDetail): large floating sprite, rarity, points, progress and the
// what/habitat/tracking-tip panels.
import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { Rarity } from '@/components/pixel/Rarity'
import { getSpecies } from '@/services/species.service'

export function SpeciesDetailPage() {
  const navigate = useNavigate()
  const { speciesId } = useParams()
  const { data: cr, isPending } = useQuery({
    queryKey: ['species', speciesId],
    queryFn: () => getSpecies(speciesId ?? ''),
  })

  if (isPending) return null
  if (!cr) return <Navigate to="/especies" replace />

  const pct = Math.round((cr.found / cr.total) * 100)

  return (
    <div className="screen">
      <div className="pad stack" style={{ gap: 16 }}>
        <button
          className="chip chip-ghost"
          onClick={() => navigate('/especies')}
          style={{ alignSelf: 'flex-start' }}
        >
          ← Las especies
        </button>

        <div
          className="panel pad center"
          style={{
            flexDirection: 'column',
            gap: 12,
            padding: '26px 16px',
            background: 'var(--bg2)',
          }}
        >
          <div className="floaty">
            <CreatureSprite id={cr.id} scale={9} />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
              #{cr.dexNumber}
            </span>
            <span className="display" style={{ fontSize: 18 }}>
              {cr.name}
            </span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
              RAREZA
            </span>
            <Rarity level={cr.rarity} />
            <span className="chip" style={{ marginLeft: 4 }}>
              {cr.rarity}
            </span>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div
            className="panel pad grow center"
            style={{ flexDirection: 'column', gap: 4, padding: 14 }}
          >
            <span className="display" style={{ fontSize: 18, color: 'var(--accent3)' }}>
              +{cr.points}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              PUNTOS
            </span>
          </div>
          <div className="panel pad grow" style={{ padding: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                AVISTADAS
              </span>
              <span className="display" style={{ fontSize: 11 }}>
                {cr.found}/{cr.total}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: pct + '%' }} />
            </div>
          </div>
        </div>

        {(
          [
            ['¿Qué es?', cr.description],
            ['Hábitat', cr.habitat],
            ['Pista de rastreo', cr.trackingTip],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="panel pad" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--accent)' }}>
              {label}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
