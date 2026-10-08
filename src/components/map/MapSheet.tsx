// The map screen's bottom sheet (LCHP-34): one surface for the sighting
// detail and the «Cerca de ti» list. It reports how much of the screen it
// covers so the map can centre above it and the floating controls can ride
// on top (the pattern is Alcorqueando's dock → setPadding).
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

const SWIPE_PX = 28

export function MapSheet({
  open,
  onToggle,
  onHeight,
  header,
  children,
}: {
  open: boolean
  onToggle: (open: boolean) => void
  /** Height in CSS px the sheet covers, on every change. */
  onHeight: (px: number) => void
  /** Always visible, also when folded. */
  header: ReactNode
  /** Hidden while folded. */
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onHeightRef = useRef(onHeight)
  const dragStartY = useRef<number | null>(null)
  const swiped = useRef(false)

  useEffect(() => {
    onHeightRef.current = onHeight
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => onHeightRef.current(Math.round(el.getBoundingClientRect().height))
    report()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(report)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // A swipe on the handle folds or unfolds; a plain tap toggles.
  const onPointerDown = (event: PointerEvent) => {
    dragStartY.current = event.clientY
  }
  const onPointerUp = (event: PointerEvent) => {
    const start = dragStartY.current
    dragStartY.current = null
    if (start === null) return
    const dy = event.clientY - start
    if (Math.abs(dy) <= SWIPE_PX) return
    // The click that follows this pointerup must not toggle it back.
    swiped.current = true
    onToggle(dy < 0)
  }
  const onClick = () => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    onToggle(!open)
  }

  return (
    <div ref={ref} className="map-sheet">
      <button
        type="button"
        className="map-sheet-handle"
        aria-label={open ? 'Plegar la lista' : 'Desplegar la lista'}
        aria-expanded={open}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      <div className="map-sheet-body">
        {header}
        {open && children}
      </div>
    </div>
  )
}
