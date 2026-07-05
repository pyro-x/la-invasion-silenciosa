// La Latina vector map, ported from the prototype (screens1.jsx StreetMap):
// OpenStreetMap geometry rendered as SVG in the 1000×527 canvas space, with
// creature pins on top. Real MapLibre tiles replace this in LCHP-13 (D-016).
import { useEffect, useRef, useState } from 'react'
import { CreatureSprite } from '@/components/pixel/CreatureSprite'
import type { SightingStatus } from '@/types/sighting'
import type { SpeciesId } from '@/types/species'
import geoData from './lalatina-geo.json'

type LaLatinaGeo = {
  W: number
  H: number
  streets: { d: string; w: number }[]
  buildings: string[]
  greens: string[]
  plazas: string[]
}

const GEO: LaLatinaGeo = geoData

export type MapPin = {
  id: string
  speciesId: SpeciesId
  x: number
  y: number
  status: SightingStatus
}

export function StreetMap({ pins }: { pins: MapPin[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: GEO.W, h: GEO.H })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setBox({ w: rect.width, h: rect.height })
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // Crop with the container's own aspect ratio (no distortion), centered on
  // the neighborhood core — same math as the prototype.
  const aspect = box.w / box.h
  let vh = GEO.H
  let vw = vh * aspect
  if (vw > GEO.W) {
    vw = GEO.W
    vh = vw / aspect
  }
  const cx = 710
  const cy = 225
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const x0 = clamp(cx - vw / 2, 0, Math.max(0, GEO.W - vw))
  const y0 = clamp(cy - vh / 2, 0, Math.max(0, GEO.H - vh))
  const toScreen = (p: { x: number; y: number }) => ({
    left: ((p.x - x0) / vw) * 100,
    top: ((p.y - y0) / vh) * 100,
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
          <rect x="0" y="0" width={GEO.W} height={GEO.H} style={{ fill: 'var(--bg2)' }} />
          {GEO.greens.map((points, i) => (
            <polygon key={`g${i}`} points={points} style={{ fill: '#b7cd97', opacity: 0.75 }} />
          ))}
          {GEO.buildings.map((points, i) => (
            <polygon
              key={`b${i}`}
              points={points}
              style={{
                fill: 'var(--card2)',
                stroke: 'var(--line)',
                strokeWidth: 0.6,
                strokeLinejoin: 'round',
              }}
            />
          ))}
          {GEO.plazas.map((points, i) => (
            <polygon key={`z${i}`} points={points} style={{ fill: 'var(--card)', opacity: 0.7 }} />
          ))}
          {GEO.streets.map((street, i) => (
            <path
              key={`s${i}`}
              d={street.d}
              style={{
                fill: 'none',
                stroke: 'var(--card)',
                strokeWidth: street.w * 1.5,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
            />
          ))}
        </svg>

        {pins.map((pin) => {
          const p = toScreen(pin)
          if (p.left < -6 || p.left > 106 || p.top < -6 || p.top > 106) return null
          return (
            <div
              key={pin.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: `${p.top}%`,
                transform: 'translate(-50%,-100%)',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  padding: 4,
                  borderRadius: 8,
                  background: 'var(--card)',
                  border: `var(--bw) solid ${pin.status === 'pending' ? 'var(--warn)' : 'var(--line)'}`,
                  boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
                  animation: pin.status === 'pending' ? 'blinkdot 1.4s infinite' : 'none',
                }}
              >
                <CreatureSprite id={pin.speciesId} scale={2.6} />
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
