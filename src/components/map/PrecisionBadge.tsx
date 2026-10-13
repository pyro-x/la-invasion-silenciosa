// How much to trust the position on screen (LCHP-49), as Alcorqueando's
// dock badge says it: the error of the fix, or its age once it is old.
// One component for the map, the verification card and the capture step.
import { useEffect, useState } from 'react'
import { formatMeters, PLAY_RULES } from '@/lib/proximity'

const TICK_MS = 30_000

export function PrecisionBadge({ accuracyM, at }: { accuracyM: number; at: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const minutes = Math.floor((Math.max(now, at) - at) / 60_000)
  const old = minutes * 60_000 >= PLAY_RULES.stalePositionMs
  const warn = old || accuracyM > PLAY_RULES.warnAccuracyM
  return (
    <span className={'geo-badge' + (warn ? ' is-warn' : '')}>
      {old ? `Posición de hace ${minutes} min` : `± ${formatMeters(accuracyM)}`}
    </span>
  )
}
