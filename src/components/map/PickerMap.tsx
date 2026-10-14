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
  /** Space covered by the dock: the map centres above it. */
  bottomPadding: number
  /** The centre settled: on load and after every move; `byUser` for a gesture. */
  onCenterChanged: (center: LngLat, byUser: boolean, zoom: number) => void
}

export function PickerMap({
  initialCenter,
  flyTo,
  me,
  rangeM,
  bottomPadding,
  onCenterChanged,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controller = useRef<BarrioMapController | null>(null)
  const onCenterChangedRef = useRef(onCenterChanged)
  const [opensAt] = useState(initialCenter)

  useEffect(() => {
    onCenterChangedRef.current = onCenterChanged
  })

  useEffect(() => {
    if (!containerRef.current) return
    const created = createBarrioMap(
      containerRef.current,
      {
        onPick: () => {},
        onMapTap: () => {},
        onUserMove: () => {},
        onUserSettled: () => {},
        onCenterChanged: (center, byUser, zoom) => onCenterChangedRef.current(center, byUser, zoom),
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
    controller.current?.setBottomPadding(bottomPadding)
  }, [bottomPadding])

  useEffect(() => {
    if (flyTo) controller.current?.follow(flyTo, PICK_ZOOM)
  }, [flyTo])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
