// Species list (Pokédex) ported from the prototype (screens2.jsx
// PokedexScreen). The detail is a route (/especies/:speciesId) instead of
// in-component state so species cards are deep-linkable.
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { Rarity } from '@/components/pixel/Rarity'
import { listSpecies } from '@/services/species.service'

export function SpeciesPage() {
  const navigate = useNavigate()
  const { data: species = [] } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  const totalFound = species.reduce((a, c) => a + c.found, 0)
  const totalAll = species.reduce((a, c) => a + c.total, 0)

  return (
    <div className="screen">
      <div className="pad stack" style={{ gap: 14 }}>
        <div className="scr-head">
          <div>
            <div className="eyebrow">Las especies</div>
            <div className="scr-title" style={{ fontSize: 20 }}>
              Guía de campo de la turistificación
            </div>
          </div>
          <span className="chip chip-accent display" style={{ fontSize: 10 }}>
            {totalFound}/{totalAll}
          </span>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {species.map((c) => (
            <button
              key={c.id}
              className="panel pad"
              onClick={() => navigate(`/especies/${c.id}`)}
              style={{
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div
                className="panel-2 center"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 8,
                  border: 'var(--bw) solid var(--line)',
                  flexShrink: 0,
                }}
              >
                <CreatureSprite id={c.id} scale={3.4} />
              </div>
              <div className="grow">
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                    #{c.dexNumber}
                  </span>
                  <span className="display" style={{ fontSize: 12 }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', lineHeight: 1.35 }}>
                  {c.description}
                </div>
              </div>
              <div className="stack" style={{ alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <Rarity level={c.rarity} />
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>
                  {c.found}/{c.total}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
