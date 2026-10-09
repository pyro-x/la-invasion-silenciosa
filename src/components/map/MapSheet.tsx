// The map screen's bottom sheet (LCHP-34): one surface for the sighting
// detail and the «Cerca de ti» list. It reports how much of the screen it
// covers so the map can centre above it and the floating controls can ride
// on top (the pattern is Alcorqueando's dock → setPadding).
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

const SWIPE_PX = 28

export function MapSheet({
  label,
  open,
  foldable = true,
  onToggle,
  onHeight,
  header,
  headerKey,
  children,
}: {
  /** Names the sheet for assistive technology. */
  label: string
  open: boolean
  /** Without anything to fold away there is no handle. */
  foldable?: boolean
  onToggle: (open: boolean) => void
  /** Height in CSS px the sheet covers, on every change. */
  onHeight: (px: number) => void
  /** Always visible, also when folded. */
  header: ReactNode
  /** A new value scrolls the sheet back up to the header. */
  headerKey: string
  /** Hidden while folded. */
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
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

  // The header scrolls with the list, so a row picked far down would swap
  // the card above the fold, out of sight.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [headerKey])

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
    <section ref={ref} className="map-sheet" aria-label={label}>
      {foldable ? (
        <button
          type="button"
          className="map-sheet-handle"
          aria-label={open ? 'Plegar la lista' : 'Desplegar la lista'}
          aria-expanded={open}
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        />
      ) : (
        <div className="map-sheet-top" />
      )}
      <div ref={bodyRef} className="map-sheet-body">
        {/* polite: picking a pin swaps this for its detail card, far from
            the pin in DOM order — say so without stealing focus */}
        <div aria-live="polite">{header}</div>
        {open && children}
      </div>
    </section>
  )
}
