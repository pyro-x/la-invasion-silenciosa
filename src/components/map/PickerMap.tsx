// The capture step's map (LCHP-36): the shared controller in picker mode.
// One effect creates and destroys it, the others push props in. The pin is
// the map's centre (D-052): the step reads it from `onCenterChanged` and
// draws the reticle over it; this component draws only the map, the
// neighbour's position and the radius a pin may be nudged in.
import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  createBarrioMap,
  type BarrioMapController,
  type LngLat,
  type MePosition,
} from './createBarrioMap'

// Street level: the 50 m radius a pin may be nudged in fills the picker.
export const PICK_ZOOM = 17

type Props = {
  /** Where the map opens, read once at mount; the barrio frame otherwise. */
  initialCenter: LngLat | null
  /** Programmatic recentre at street zoom. Same object identity = no move. */
  flyTo: LngLat | null
  me: MePosition | null
  /** Metres the pin may be from the neighbour: drawn as a ring around `me`. */
  rangeM: number
  /** Space covered by the header card and the dock: the map centres between them. */
  padding: { top: number; bottom: number }
  /** The neighbour took the map: a gesture started. */
  onUserMove: () => void
  /** The centre settled: on load and after every move; `byUser` for a gesture. */
  onCenterChanged: (center: LngLat, byUser: boolean, zoom: number) => void
}

export function PickerMap({
  initialCenter,
  flyTo,
  me,
  rangeM,
  padding,
  onUserMove,
  onCenterChanged,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controller = useRef<BarrioMapController | null>(null)
  const handlers = useRef({ onUserMove, onCenterChanged })
  const [opensAt] = useState(initialCenter)

  useEffect(() => {
    handlers.current = { onUserMove, onCenterChanged }
  })

  useEffect(() => {
    if (!containerRef.current) return
    const created = createBarrioMap(
      containerRef.current,
      {
        onPick: () => {},
        onMapTap: () => {},
        onUserMove: () => handlers.current.onUserMove(),
        onUserSettled: () => {},
        onCenterChanged: (center, byUser, zoom) =>
          handlers.current.onCenterChanged(center, byUser, zoom),
      },
      { mode: 'picker', center: opensAt ?? undefined, zoom: PICK_ZOOM },
    )
    controller.current = created
    return () => {
      created.destroy()
      controller.current = null
    }
  }, [opensAt])

  useEffect(() => {
    controller.current?.setMe(me, rangeM)
  }, [me, rangeM])

  useEffect(() => {
    controller.current?.setPadding(padding.bottom, padding.top)
  }, [padding.bottom, padding.top])

  useEffect(() => {
    if (flyTo) controller.current?.follow(flyTo, PICK_ZOOM)
  }, [flyTo])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
