// Why a sighting cannot be sent from where the neighbour stands now (D-069,
// D-070): the rule of step 3 holds until the send, in the review's words.
import { isWithinLaLatina } from '@/lib/geo'
import type { GeoPosition } from '@/lib/geoWatch'
import { formatMeters, PLAY_RULES, presenceAt, type Point } from '@/lib/proximity'

const RADIUS = formatMeters(PLAY_RULES.captureRadiusM)

export function whyNotSend(me: GeoPosition | null, pin: Point): string | null {
  if (!me) {
    return 'Activa tu ubicación para enviar: una criatura solo se registra estando junto a ella.'
  }
  const presence = presenceAt(me, pin, PLAY_RULES.captureRadiusM)
  if (presence.kind === 'vague') {
    return `Tu ubicación es poco precisa (± ${formatMeters(presence.accuracyM)}) para enviar.`
  }
  if (!isWithinLaLatina(me.lat, me.lng)) {
    return 'Estás fuera de La Latina: desde ahí no se puede enviar.'
  }
  if (presence.kind === 'far') {
    return `El pin está a ${formatMeters(Math.ceil(presence.distanceM))} de ti. Acércate a menos de ${RADIUS}, o vuelve a situarlo.`
  }
  return null
}
