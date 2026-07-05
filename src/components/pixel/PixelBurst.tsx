// Success-screen pixel explosion, ported from the prototype (pixel.jsx
// PixelBurst). Keyframes burst0..burst2 live in globals.css. The scatter is
// rolled once at module load: render must stay pure (react-hooks/purity).
import type { CSSProperties } from 'react'

type Bit = {
  dx: number
  dy: number
  color: string
  delay: number
  size: number
}

const COLORS = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', 'var(--warn)']

const BITS: Bit[] = Array.from({ length: 18 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 18 + Math.random()
  const distance = 60 + Math.random() * 70
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.15,
    size: 8 + Math.random() * 6,
  }
})

export function PixelBurst() {
  const bits = BITS
  return (
    <div
      aria-hidden
      className="burst"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {bits.map((bit, i) => {
        const style: CSSProperties & { '--dx': string; '--dy': string } = {
          position: 'absolute',
          left: '50%',
          top: '38%',
          width: bit.size,
          height: bit.size,
          background: bit.color,
          borderRadius: 2,
          animation: `burst${i % 3} 0.9s ease-out ${bit.delay}s both`,
          '--dx': `${bit.dx}px`,
          '--dy': `${bit.dy}px`,
        }
        return <span key={i} style={style} />
      })}
    </div>
  )
}
