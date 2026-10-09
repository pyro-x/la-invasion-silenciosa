// React wrapper around the barrio map controller (LCHP-34): one effect
// creates and destroys it, the others push props in. The map draws the
// sightings itself (LCHP-35), so nothing of them is rendered here. No photos
// are loaded here (evidence is on demand, brief §18).
import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  createBarrioMap,
  type BarrioMapController,
  type LngLat,
  type MePosition,
} from './createBarrioMap'
import type { MapSightingGeo } from '@/types/sighting'

/**
 * A one-off camera move; a new object identity = a new move. With the id of
 * a sighting the map goes to where it draws that sighting.
 */
export type MapFocus = LngLat & { id?: string }

// Close enough to read street names around the user's position.
const FOLLOW_MIN_ZOOM = 17

type Props = {
  sightings: MapSightingGeo[]
  selectedId: string | null
  /** Show where sightings pile up instead of each one. */
  heat: boolean
  onPick: (id: string) => void
  onMapTap: () => void
  onUserMove: () => void
  me: MePosition | null
  /** Keep the map centred on `me` as fixes arrive. */
  follow: boolean
  /** Counts the taps on «Ir a mi posición»: each one zooms in again. */
  followRequest: number
  bottomPadding: number
  focus: MapFocus | null
  /** Zoom steps requested by the on-screen buttons; identity = a new step. */
  zoomStep: { delta: number } | null
}

export function BarrioMap({
  sightings,
  selectedId,
  heat,
  onPick,
  onMapTap,
  onUserMove,
  me,
  follow,
  followRequest,
  bottomPadding,
  focus,
  zoomStep,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Effects run in order, so by the time the ones below fire the controller
  // exists; StrictMode's remount re-runs them all against the new one.
  const controller = useRef<BarrioMapController | null>(null)
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
    controller.current?.setHeat(heat)
  }, [heat])

  useEffect(() => {
    controller.current?.setMe(me)
  }, [me])

  useEffect(() => {
    controller.current?.setBottomPadding(bottomPadding)
  }, [bottomPadding])

  useEffect(() => {
    if (focus) controller.current?.goTo(focus)
  }, [focus])

  // Zooming in is part of asking for the position, not of staying on it:
  // later fixes only recentre, so a neighbour who zooms out is not pulled
  // back in every few seconds.
  const zoomedFor = useRef<number | null>(null)
  useEffect(() => {
    if (!follow || !me) return
    const asked = zoomedFor.current !== followRequest
    zoomedFor.current = followRequest
    controller.current?.follow(me, asked ? FOLLOW_MIN_ZOOM : undefined)
  }, [follow, me, followRequest])

  useEffect(() => {
    if (zoomStep) controller.current?.zoomBy(zoomStep.delta)
  }, [zoomStep])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
