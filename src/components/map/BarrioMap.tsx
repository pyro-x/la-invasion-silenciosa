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
import { keepMapSession, mapSession } from '@/lib/mapSession'
import { isVague } from '@/lib/proximity'
import type { MapSightingGeo } from '@/types/sighting'

/**
 * A one-off camera move; a new object identity = a new move. With the id of
 * a sighting the map goes to where it draws that sighting.
 */
export type MapFocus = LngLat & { id?: string }

// Close enough to read street names around the user's position.
const FOLLOW_MIN_ZOOM = 17
// A vague position does not deserve a street-level zoom.
const VAGUE_ZOOM = 15
// GPS noise of a few decimetres is not worth a map move.
const NOISE_M = 0.7
// How long the map is left alone after the neighbour's hand before it may
// go back to following by itself.
export const RESUME_IDLE_MS = 10_000

type Props = {
  sightings: MapSightingGeo[]
  selectedId: string | null
  /** Show where sightings pile up instead of each one. */
  heat: boolean
  onPick: (id: string) => void
  onMapTap: () => void
  onUserMove: () => void
  me: MePosition | null
  /** Metres the neighbour can act within: drawn as a ring around `me`. */
  rangeM: number | null
  /** Keep the map centred on `me` as fixes arrive. */
  follow: boolean
  /**
   * Following may come back by itself: once the map has been left alone for
   * a while and the neighbour has walked out of what it shows.
   */
  mayResumeFollow: boolean
  onResumeFollow: () => void
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
  rangeM,
  follow,
  mayResumeFollow,
  onResumeFollow,
  followRequest,
  bottomPadding,
  focus,
  zoomStep,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Effects run in order, so by the time the ones below fire the controller
  // exists; StrictMode's remount re-runs them all against the new one.
  const controller = useRef<BarrioMapController | null>(null)
  const handlers = useRef({ onPick, onMapTap, onUserMove, onResumeFollow })
  // Which tap on «Ir a mi posición» the map has already zoomed in for, and
  // whether it still owes that tap the street-level zoom.
  const zoomedFor = useRef<number | null>(null)
  const streetOwed = useRef(false)
  // When the neighbour last moved the map or changed what is picked.
  const touchedAt = useRef(0)
  const latestRequest = useRef(followRequest)

  useEffect(() => {
    handlers.current = { onPick, onMapTap, onUserMove, onResumeFollow }
    latestRequest.current = followRequest
  })

  useEffect(() => {
    if (!containerRef.current) return
    const created = createBarrioMap(containerRef.current, {
      onPick: (id) => handlers.current.onPick(id),
      onMapTap: () => handlers.current.onMapTap(),
      onUserMove: () => {
        touchedAt.current = Date.now()
        handlers.current.onUserMove()
      },
      // The wait before following returns counts from the hand leaving the
      // map, not from it landing: a drag can last longer than the wait.
      onUserSettled: () => {
        touchedAt.current = Date.now()
      },
    })
    controller.current = created
    // A map that opens on the view it was left with (LCHP-56) carries on
    // from there: the zoom-in already given is not given again.
    const left = mapSession()
    if (left.view) {
      if (left.zoomSpent) zoomedFor.current = latestRequest.current
      streetOwed.current = left.streetOwed
    }
    return () => {
      keepMapSession({
        zoomSpent: zoomedFor.current === latestRequest.current,
        streetOwed: streetOwed.current,
      })
      created.destroy()
      controller.current = null
      // The next controller owes the zoom-in again (StrictMode's remount),
      // unless it opens on the view this one leaves.
      zoomedFor.current = null
      streetOwed.current = false
    }
  }, [])

  useEffect(() => {
    controller.current?.setSightings(sightings)
  }, [sightings])

  useEffect(() => {
    touchedAt.current = Date.now()
    controller.current?.setSelected(selectedId)
  }, [selectedId])

  useEffect(() => {
    controller.current?.setHeat(heat)
  }, [heat])

  useEffect(() => {
    controller.current?.setMe(me, rangeM)
  }, [me, rangeM])

  useEffect(() => {
    controller.current?.setPadding(bottomPadding)
  }, [bottomPadding])

  useEffect(() => {
    if (focus) controller.current?.goTo(focus)
  }, [focus])

  // Zooming in is part of asking for the position, not of staying on it:
  // later fixes only recentre, so a neighbour who zooms out is not pulled
  // back in every few seconds. The street-level zoom waits for a fix that
  // deserves it: a vague one only gets as close as the barrio.
  // A neighbour who took the map before the zoom-in happened has spent it:
  // following that returns by itself only recentres.
  useEffect(() => {
    const map = controller.current
    if (!me || !map) return
    if (!follow) {
      zoomedFor.current = followRequest
      streetOwed.current = false
      return
    }
    const vague = isVague(me)
    if (zoomedFor.current !== followRequest) {
      zoomedFor.current = followRequest
      streetOwed.current = vague
      map.follow(me, vague ? VAGUE_ZOOM : FOLLOW_MIN_ZOOM)
      return
    }
    if (streetOwed.current && !vague) {
      streetOwed.current = false
      map.follow(me, FOLLOW_MIN_ZOOM)
      return
    }
    if (map.metresFromCentre(me) < NOISE_M) return
    map.follow(me)
  }, [follow, me, followRequest])

  // Before the effect below: a press on a zoom button is a touch.
  useEffect(() => {
    if (!zoomStep) return
    touchedAt.current = Date.now()
    controller.current?.zoomBy(zoomStep.delta)
  }, [zoomStep])

  // Alcorqueando's rule: a neighbour who dragged the map to look around and
  // then walked on gets the map back without asking for it. Judged when a
  // position arrives, as there: the watch brings one at least every 20 s.
  useEffect(() => {
    const map = controller.current
    if (follow || !mayResumeFollow || !me || !map || rangeM === null) return
    // A drag or a pinch can last longer than the wait: never under a hand.
    if (map.isMoving()) return
    if (Date.now() - touchedAt.current < RESUME_IDLE_MS) return
    if (map.metresFromCentre(me) <= rangeM) return
    handlers.current.onResumeFollow()
  }, [follow, mayResumeFollow, me, rangeM])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
