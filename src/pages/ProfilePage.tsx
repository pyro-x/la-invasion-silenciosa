// Player notebook, ported from the prototype (screens2.jsx ProfileScreen):
// level + progress, per-action stats, captures per species, badges and the
// points reminder. The association-mode entry and the certificate are
// post-MVP and intentionally omitted (LCHP-9 out of scope, D-028).
import { useQuery } from '@tanstack/react-query'
import { APP_VERSION } from '@/lib/version'
import { MiniPix } from '@/components/pixel/PixelSprite'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import { NAV_ICONS } from '@/components/pixel/sprites'
import { getBadges, getProfile, LEVELS, levelForPoints } from '@/services/profile.service'
import { listSpecies } from '@/services/species.service'

const STATS: { key: 'sightings' | 'verifications' | 'videos'; label: string; points: string }[] = [
  { key: 'sightings', label: 'observaciones', points: '+10' },
  { key: 'verifications', label: 'verificaciones', points: '+5' },
  { key: 'videos', label: 'vídeos', points: '+10' },
]

const HOW_POINTS: { label: string; points: string }[] = [
  { label: 'Nueva observación validada', points: '+10' },
  { label: 'Verificación de otro usuario', points: '+5' },
  { label: 'Vídeo para redes', points: '+10' },
]

export function ProfilePage() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const { data: badges } = useQuery({ queryKey: ['profile', 'badges'], queryFn: getBadges })
  const { data: species } = useQuery({ queryKey: ['species'], queryFn: listSpecies })

  if (!profile) return <div className="screen" />

  const level = levelForPoints(profile.points)
  const isMaxLevel = level.maxPoints === 9999
  const band = isMaxLevel ? null : level.maxPoints - level.minPoints + 1
  const inBand = profile.points - level.minPoints
  const pct = band ? Math.min(100, Math.round((inBand / band) * 100)) : 100
  const toNext = isMaxLevel ? 0 : level.maxPoints + 1 - profile.points
  const nextLevel = level.id < LEVELS.length ? LEVELS[level.id] : null

  return (
    <div className="screen">
      <div className="pad stack" style={{ gap: 14 }}>
        <div className="eyebrow">Tu cuaderno</div>

        {/* profile header */}
        <div className="panel pad" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 14 }}>
            <div
              className="center"
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: profile.color,
                border: 'var(--bw) solid var(--line)',
                flexShrink: 0,
              }}
            >
              <MiniPix grid={NAV_ICONS.me} scale={3.6} style={{ color: '#fff' }} />
            </div>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 17 }}>@{profile.alias}</div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <span className="chip chip-accent display" style={{ fontSize: 9 }}>
                  N{level.id} · {level.name}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                  vas el #{profile.weekRank}
                </span>
              </div>
            </div>
            <div className="stack center" style={{ flexShrink: 0 }}>
              <span className="display" style={{ fontSize: 22, color: 'var(--accent3)' }}>
                {profile.points}
              </span>
              <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)' }}>
                PTS
              </span>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>
                {level.name.toUpperCase()}
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>
                {nextLevel ? `${toNext} pts → ${nextLevel.name}` : '¡Nivel máximo!'}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* points stats */}
        <div className="row" style={{ gap: 8 }}>
          {STATS.map((stat) => (
            <div
              key={stat.key}
              className="panel pad grow center"
              style={{ flexDirection: 'column', gap: 2, padding: 12 }}
            >
              <span className="display" style={{ fontSize: 18 }}>
                {profile.counts[stat.key]}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9.5, color: 'var(--ink-dim)', textAlign: 'center' }}
              >
                {stat.label}
              </span>
              <span
                className="chip chip-good"
                style={{ fontSize: 9, marginTop: 4, padding: '2px 7px' }}
              >
                {stat.points}
              </span>
            </div>
          ))}
        </div>

        {/* captures per species */}
        <div className="panel pad" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Tus capturas
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {species?.map((sp) => (
              <div key={sp.id} className="row" style={{ gap: 10 }}>
                <CreatureSprite id={sp.id} scale={2.6} />
                <span className="grow" style={{ fontSize: 13, fontWeight: 600 }}>
                  {sp.name}
                </span>
                <div className="bar" style={{ width: 90, height: 12 }}>
                  <i style={{ width: `${(profile.perSpecies[sp.id] / sp.total) * 100}%` }} />
                </div>
                <span
                  className="mono nowrap"
                  style={{ fontSize: 11, color: 'var(--ink-dim)', width: 36, textAlign: 'right' }}
                >
                  {profile.perSpecies[sp.id]}/{sp.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* badges */}
        <div className="panel pad" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Insignias
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {badges?.map((badge) => (
              <div
                key={badge.id}
                className="stack center"
                style={{ gap: 5, opacity: badge.earned ? 1 : 0.4 }}
              >
                <div
                  className="center"
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 'var(--radius)',
                    border: 'var(--bw) solid var(--line)',
                    background: badge.earned ? 'var(--card2)' : 'var(--bg2)',
                    boxShadow: badge.earned ? 'var(--shadow)' : 'none',
                    fontSize: 20,
                  }}
                >
                  <span style={{ filter: badge.earned ? 'none' : 'grayscale(1)' }}>
                    {badge.icon}
                  </span>
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 8.5,
                    color: 'var(--ink-dim)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* how points add up */}
        <div className="panel panel-2 pad" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            ¿Cómo se suman puntos?
          </div>
          {HOW_POINTS.map((row, i) => (
            <div
              key={row.label}
              className="row"
              style={{
                justifyContent: 'space-between',
                padding: '7px 0',
                borderTop: i ? '1px solid var(--line)' : 'none',
              }}
            >
              <span style={{ fontSize: 13 }}>{row.label}</span>
              <span className="chip chip-good" style={{ fontSize: 10 }}>
                {row.points} pts
              </span>
            </div>
          ))}
        </div>

        {/* Build identity for street bug reports (LCHP-24, D-040) — a
            sanctioned divergence from the mockup, which has no version. */}
        <div
          className="mono"
          style={{
            textAlign: 'center',
            fontSize: 9,
            letterSpacing: '0.08em',
            color: 'var(--ink-dim)',
            paddingTop: 4,
          }}
        >
          {APP_VERSION}
        </div>
      </div>
    </div>
  )
}
