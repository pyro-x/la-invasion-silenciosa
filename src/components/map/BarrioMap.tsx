// React wrapper around the barrio map controller (LCHP-34): one effect
// creates and destroys it, the others push props in. Sighting pins are
// React sprites rendered through portals into the controller's marker
// elements — the map owns positioning, React owns the pixels. No photos are
// loaded here (evidence is on demand, brief §18).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  createBarrioMap,
  type BarrioMapController,
  type LngLat,
  type MarkerMount,
  type MePosition,
} from './createBarrioMap'
import type { MapSightingGeo } from '@/types/sighting'

/** A one-off camera move; a new object identity = a new move. */
export type MapFocus = LngLat & { minZoom?: number }

// Close enough to read street names around the user's position.
const FOLLOW_MIN_ZOOM = 17

type Props = {
  sightings: MapSightingGeo[]
  selectedId: string | null
  onPick: (id: string) => void
  onMapTap: () => void
  onUserMove: () => void
  renderMarker: (s: MapSightingGeo, selected: boolean) => ReactNode
  me: MePosition | null
  /** Keep the map centred on `me` as fixes arrive. */
  follow: boolean
  bottomPadding: number
  focus: MapFocus | null
  /** Zoom steps requested by the on-screen buttons; identity = a new step. */
  zoomStep: { delta: number } | null
}

export function BarrioMap({
  sightings,
  selectedId,
  onPick,
  onMapTap,
  onUserMove,
  renderMarker,
  me,
  follow,
  bottomPadding,
  focus,
  zoomStep,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Effects run in order, so by the time the ones below fire the controller
  // exists; StrictMode's remount re-runs them all against the new one.
  const controller = useRef<BarrioMapController | null>(null)
  const [mounts, setMounts] = useState<MarkerMount[]>([])
  const handlers = useRef({ onPick, onMapTap, onUserMove })

  useEffect(() => {
    handlers.current = { onPick, onMapTap, onUserMove }
  })

  useEffect(() => {
    if (!containerRef.current) return
    const created = createBarrioMap(containerRef.current, {
      onPick: (id) => handlers.current.onPick(id),
      onMapTap: () => handlers.current.onMapTap(),
      onUserMove: () => handlers.current.onUserMove(),
      onMarkers: setMounts,
    })
    controller.current = created
    return () => {
      created.destroy()
      controller.current = null
    }
  }, [])

  useEffect(() => {
    controller.current?.setSightings(sightings)
  }, [sightings])

  useEffect(() => {
    controller.current?.setSelected(selectedId)
  }, [selectedId])

  useEffect(() => {
    controller.current?.setMe(me)
  }, [me])

  useEffect(() => {
    controller.current?.setBottomPadding(bottomPadding)
  }, [bottomPadding])

  useEffect(() => {
    if (focus) controller.current?.goTo(focus, focus.minZoom)
  }, [focus])

  useEffect(() => {
    if (follow && me) controller.current?.goTo(me, FOLLOW_MIN_ZOOM)
  }, [follow, me])

  useEffect(() => {
    if (zoomStep) controller.current?.zoomBy(zoomStep.delta)
  }, [zoomStep])

  const byId = new Map(sightings.map((s) => [s.id, s]))

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {mounts.map(({ id, el }) => {
        const sighting = byId.get(id)
        return sighting ? createPortal(renderMarker(sighting, id === selectedId), el) : null
      })}
    </div>
  )
}
