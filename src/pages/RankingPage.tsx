// Weekly Top 10, ported from the prototype (screens2.jsx RankingScreen):
// 2-1-3 podium plus the 4–10 list with the current user highlighted.
import { useQuery } from '@tanstack/react-query'
import { LEVELS } from '@/services/profile.service'
import { getWeeklyRanking } from '@/services/ranking.service'
import type { RankingEntry } from '@/types/profile'

const PODIUM_HEIGHTS: Record<number, number> = { 1: 92, 2: 68, 3: 54 }

export function RankingPage() {
  const { data: ranking } = useQuery({ queryKey: ['ranking', 'weekly'], queryFn: getWeeklyRanking })
  const podium = ranking ? [ranking[1], ranking[0], ranking[2]] : []

  return (
    <div className="screen">
      <div className="pad stack" style={{ gap: 16 }}>
        <div>
          <div className="eyebrow">Ranking semanal</div>
          <div className="scr-title" style={{ fontSize: 20 }}>
            Top 10 cazadores · esta semana
          </div>
        </div>

        <div
          className="row"
          style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 10, padding: '4px 0' }}
        >
          {podium.map((entry) => (
            <PodiumColumn key={entry.alias} entry={entry} />
          ))}
        </div>

        <div className="stack" style={{ gap: 8 }}>
          {ranking?.slice(3).map((entry) => (
            <RankingRow key={entry.alias} entry={entry} />
          ))}
        </div>

        <div
          className="panel panel-2 pad center"
          style={{ padding: 12, gap: 8, borderStyle: 'dashed' }}
        >
          <span style={{ fontSize: 16 }}>📣</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
            El top 10 se publica cada lunes en redes. ¡Sube vídeos de tus hallazgos!
          </span>
        </div>
      </div>
    </div>
  )
}

function PodiumColumn({ entry }: { entry: RankingEntry }) {
  return (
    <div className="stack center" style={{ gap: 6, flex: 1, maxWidth: 100 }}>
      <div
        className="center"
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: entry.color,
          border: 'var(--bw) solid var(--line)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <span
          className="display"
          style={{ fontSize: 14, color: '#fff', textShadow: '0 1px 0 rgba(0,0,0,.4)' }}
        >
          {entry.rank}
        </span>
      </div>
      <span
        className="mono"
        style={{
          fontSize: 10.5,
          color: 'var(--ink)',
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        @{entry.alias}
      </span>
      <div
        className="panel center"
        style={{
          width: '100%',
          height: PODIUM_HEIGHTS[entry.rank],
          borderRadius: 'var(--radius) var(--radius) 0 0',
          background: 'var(--card2)',
          alignItems: 'flex-start',
          paddingTop: 8,
        }}
      >
        <span className="display" style={{ fontSize: 11, color: 'var(--accent)' }}>
          {entry.points}
        </span>
      </div>
    </div>
  )
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  return (
    <div
      className="panel pad"
      style={{
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderColor: entry.isMe ? 'var(--accent)' : 'var(--line)',
        background: entry.isMe ? 'var(--card2)' : 'var(--card)',
      }}
    >
      <span
        className="display"
        style={{ fontSize: 12, width: 24, color: entry.isMe ? 'var(--accent)' : 'var(--ink-dim)' }}
      >
        {entry.rank}
      </span>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: entry.color,
          border: '2px solid var(--line)',
          flexShrink: 0,
        }}
      />
      <div className="grow">
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          @{entry.alias}
          {entry.isMe && ' ·'}
          {entry.isMe && (
            <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>
              {' '}
              tú
            </span>
          )}
        </span>
      </div>
      <span className="chip chip-ghost" style={{ fontSize: 10 }}>
        {LEVELS[entry.levelId - 1].name}
      </span>
      <span className="display nowrap" style={{ fontSize: 12, color: 'var(--accent3)' }}>
        {entry.points}
      </span>
    </div>
  )
}
