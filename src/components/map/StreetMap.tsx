// La Latina street map ported from the prototype (screens1.jsx StreetMap):
// SVG render of the OSM vector extract with the same crop/centering math,
// pins as CreatureSprite buttons (pending ones blink with the warn border).
import { useEffect, useRef, useState } from 'react'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import type { MapSighting } from '@/types/sighting'
import { HeatCanvas } from './HeatCanvas'
import { LALATINA } from './lalatina-geo'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function StreetMap({
  heat,
  sightings,
  onPick,
  selected,
}: {
  heat: boolean
  sightings: MapSighting[]
  onPick: (s: MapSighting) => void
  selected: string | null
}) {
  const G = LALATINA
  const W = G.W
  const H = G.H
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: W, h: H })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const upd = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height })
    }
    upd()
    let ro: ResizeObserver | undefined
    if (window.ResizeObserver) {
      ro = new ResizeObserver(upd)
      ro.observe(el)
    }
    window.addEventListener('resize', upd)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', upd)
    }
  }, [])
  // crop with the SAME aspect ratio as the container (no distortion), centered on the core
  const aspect = box.w / box.h
  let vh = H
  let vw = vh * aspect
  if (vw > W) {
    vw = W
    vh = vw / aspect
  }
  const cx = 710
  const cy = 225
  const x0 = clamp(cx - vw / 2, 0, Math.max(0, W - vw))
  const y0 = clamp(cy - vh / 2, 0, Math.max(0, H - vh))
  const crop = { x0, y0, vw, vh }
  const toScreen = (s: MapSighting) => ({
    left: ((s.x - x0) / vw) * 100,
    top: ((s.y - y0) / vh) * 100,
  })
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        border: 'var(--bw) solid var(--line)',
        background: 'var(--bg2)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <svg
          viewBox={`${x0} ${y0} ${vw} ${vh}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <rect x="0" y="0" width={W} height={H} style={{ fill: 'var(--bg2)' }} />
          {G.greens.map((p, i) => (
            <polygon key={'g' + i} points={p} style={{ fill: '#b7cd97', opacity: 0.75 }} />
          ))}
          {G.buildings.map((p, i) => (
            <polygon
              key={'b' + i}
              points={p}
              style={{
                fill: 'var(--card2)',
                stroke: 'var(--line)',
                strokeWidth: 0.6,
                strokeLinejoin: 'round',
              }}
            />
          ))}
          {G.plazas.map((p, i) => (
            <polygon key={'z' + i} points={p} style={{ fill: 'var(--card)', opacity: 0.7 }} />
          ))}
          {G.streets.map((s, i) => (
            <path
              key={'s' + i}
              d={s.d}
              style={{
                fill: 'none',
                stroke: 'var(--card)',
                strokeWidth: s.w * 1.5,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
            />
          ))}
        </svg>

        {heat && <HeatCanvas sightings={sightings} crop={crop} />}

        {!heat &&
          sightings.map((s) => {
            const p = toScreen(s)
            if (p.left < -6 || p.left > 106 || p.top < -6 || p.top > 106) return null
            return (
              <button
                key={s.id}
                aria-label={`Avistamiento ${s.id}`}
                onClick={() => onPick(s)}
                style={{
                  position: 'absolute',
                  left: p.left + '%',
                  top: p.top + '%',
                  transform: 'translate(-50%,-100%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  zIndex: selected === s.id ? 5 : 2,
                }}
              >
                <div
                  style={{
                    padding: 4,
                    borderRadius: 8,
                    background: 'var(--card)',
                    border: `var(--bw) solid ${s.status === 'pending' ? 'var(--warn)' : 'var(--line)'}`,
                    boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
                    transform: selected === s.id ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform .1s',
                    animation: s.status === 'pending' ? 'blinkdot 1.4s infinite' : 'none',
                  }}
                >
                  <CreatureSprite id={s.speciesId} scale={2.6} />
                </div>
                <div
                  style={{
                    width: 0,
                    height: 0,
                    margin: '0 auto',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '7px solid var(--line)',
                  }}
                />
              </button>
            )
          })}
      </div>
    </div>
  )
}
