// What the app says about the neighbour's position, and the one thing to do
// about it (Alcorqueando's dock: ask, searching, error, imprecise), shared by
// the map's sheet, the capture gate and the location step (LCHP-49,
// LCHP-54). The native prompt is never raised without a tap (D-052): without
// a position the notice asks, and the tap on its button is the gesture the
// browser wants.
import type { GeoWatchState } from '@/lib/geoWatch'
import { locationSettingsGuidance, precisionGuidance } from '@/lib/permissions'
import { formatMeters, isVague } from '@/lib/proximity'

/** `kind` names the notice whatever its numbers say: closing «poco precisa»
 * at ± 180 m keeps it closed at ± 172 m. */
export type LocatePanel = { kind: string; text: string; action: string | null }

export function locatePanel(geo: GeoWatchState, outsideBarrio: boolean): LocatePanel | null {
  switch (geo.kind) {
    case 'idle':
      return {
        kind: 'ask',
        text: 'Para jugar, el mapa tiene que saber dónde estás.',
        action: 'Usar mi ubicación',
      }
    case 'paused':
      return {
        kind: 'paused',
        text: 'Para seguir jugando, el mapa tiene que volver a saber dónde estás.',
        action: 'Usar mi ubicación',
      }
    case 'searching':
      return {
        kind: 'searching',
        text: 'Buscando tu posición… Si el navegador pregunta, pulsa «Permitir».',
        action: null,
      }
    case 'denied':
      return { kind: 'denied', text: locationSettingsGuidance(), action: 'Reintentar' }
    case 'unavailable':
    case 'timeout':
      return {
        kind: 'no-signal',
        text: 'No se pudo obtener tu posición. Inténtalo otra vez al aire libre.',
        action: 'Reintentar',
      }
    case 'unsupported':
      return { kind: 'unsupported', text: 'Este navegador no ofrece tu ubicación.', action: null }
    case 'ok':
      // The map is a barrio game: a position outside La Latina is shown no
      // map to follow, and nothing there can be captured or verified.
      if (outsideBarrio) {
        return {
          kind: 'outside',
          text: 'Estás fuera de La Latina: puedes mirar el mapa, pero para cazar o verificar hay que estar en el barrio.',
          action: null,
        }
      }
      if (isVague(geo.position)) {
        return {
          kind: 'vague',
          text: `Tu ubicación es poco precisa (± ${formatMeters(geo.position.accuracyM)}). ${precisionGuidance()}`,
          action: 'Reintentar',
        }
      }
      return null
  }
}
