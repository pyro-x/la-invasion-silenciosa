// Real-density heat map ported from the prototype (screens1.jsx HeatCanvas):
// additive white blobs on a canvas, then recolored through a warm ramp.
import { useEffect, useRef } from 'react'
import type { MapSighting } from '@/types/sighting'

export type MapCrop = { x0: number; y0: number; vw: number; vh: number }

const STOPS: [number, [number, number, number, number]][] = [
  [0, [255, 214, 46, 0]],
  [0.22, [255, 214, 46, 140]],
  [0.45, [255, 150, 12, 195]],
  [0.7, [232, 52, 22, 224]],
  [1, [150, 12, 8, 240]],
]

function ramp(t: number): [number, number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const a = STOPS[i - 1]
      const b = STOPS[i]
      const k = (t - a[0]) / (b[0] - a[0] || 1)
      return a[1].map((v, j) => v + (b[1][j] - v) * k) as [number, number, number, number]
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export function HeatCanvas({ sightings, crop }: { sightings: MapSighting[]; crop: MapCrop }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let raf: number
    function draw() {
      if (!cv) return
      const host = cv.parentElement
      if (!host) return
      const W = host.clientWidth
      const H = host.clientHeight
      if (!W || !H) {
        raf = requestAnimationFrame(draw)
        return
      }
      const S = 1.4 // oversampling for sharpness
      cv.width = Math.round(W * S)
      cv.height = Math.round(H * S)
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, cv.width, cv.height)
      // 1) accumulate intensity (white blobs, additive composition)
      ctx.globalCompositeOperation = 'lighter'
      const R = Math.min(cv.width, cv.height) * 0.3
      sightings.forEach((s) => {
        const px = ((s.x - crop.x0) / crop.vw) * cv.width
        const py = ((s.y - crop.y0) / crop.vh) * cv.height
        const wgt = Math.min(0.7, 0.32 + s.verificationCount * 0.05)
        const g = ctx.createRadialGradient(px, py, 0, px, py, R)
        g.addColorStop(0, `rgba(255,255,255,${wgt})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(px, py, R, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalCompositeOperation = 'source-over'
      // 2) color the accumulated density with a warm ramp
      const img = ctx.getImageData(0, 0, cv.width, cv.height)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const inten = d[i + 3] / 255
        if (inten <= 0.02) {
          d[i + 3] = 0
          continue
        }
        const c = ramp(Math.min(1, inten))
        d[i] = c[0]
        d[i + 1] = c[1]
        d[i + 2] = c[2]
        d[i + 3] = c[3]
      }
      ctx.putImageData(img, 0, 0)
    }
    draw()
    window.addEventListener('resize', draw)
    return () => {
      window.removeEventListener('resize', draw)
      cancelAnimationFrame(raf)
    }
  }, [sightings, crop.x0, crop.y0, crop.vw, crop.vh])
  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
