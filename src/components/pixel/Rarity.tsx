// Rarity dots ported from the prototype (pixel.jsx Rarity).
import type { Rarity as RarityLevel } from '@/types/species'

const DOTS: Record<RarityLevel, number> = { común: 1, frecuente: 2, raro: 3, legendario: 4 }

export function Rarity({ level }: { level: RarityLevel }) {
  const n = DOTS[level] ?? 1
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: 2,
            border: '2px solid var(--line)',
            background: i < n ? 'var(--accent3)' : 'transparent',
          }}
        />
      ))}
    </span>
  )
}
