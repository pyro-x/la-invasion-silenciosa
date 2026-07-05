// Typed fake service (D-007): serves the prototype's data
// (docs/prototype/fuentes/data.jsx) until Supabase lands in M2+.
// Screens must depend on this interface only, never on the data shape.
import type { Species } from '@/types/species'

const SPECIES: Species[] = [
  {
    id: 'candadin',
    dexNumber: '001',
    name: 'CANDADÍN',
    rarity: 'común',
    description: 'Candado o caja de llaves instalada en la vía pública.',
    habitat: 'Rejas, farolas, vallas y portales del barrio.',
    trackingTip: 'Suelen aparecer en racimos cerca de pisos turísticos.',
    points: 10,
    found: 7,
    total: 12,
  },
  {
    id: 'turistox',
    dexNumber: '002',
    name: 'TURISTOX',
    rarity: 'frecuente',
    description: 'Edificio con actividad turística observable desde el espacio público.',
    habitat: 'Calles principales y plazas con mucho trasiego de maletas.',
    trackingTip: 'Mira los balcones: cajas de luz, llaveros y carteles de bienvenida.',
    points: 10,
    found: 5,
    total: 10,
  },
  {
    id: 'checkinchu',
    dexNumber: '003',
    name: 'CHECKINCHU',
    rarity: 'raro',
    description: 'Punto de acceso automatizado: pantalla o terminal de auto check-in.',
    habitat: 'Zaguanes, recepciones sin personal y locales reconvertidos.',
    trackingTip: 'Brilla de noche. No fotografíes a quien lo esté usando.',
    points: 10,
    found: 2,
    total: 8,
  },
  {
    id: 'keymon',
    dexNumber: '004',
    name: 'KEYMON',
    rarity: 'legendario',
    description: 'Vivienda turística completa operando en el barrio.',
    habitat: 'Plantas enteras de edificios antaño de vecinos.',
    trackingTip: 'El hallazgo más valioso. Confirma con la caja de llaves cercana.',
    points: 10,
    found: 1,
    total: 6,
  },
]

export async function listSpecies(): Promise<Species[]> {
  return SPECIES
}

export async function getSpecies(id: string): Promise<Species | undefined> {
  return SPECIES.find((s) => s.id === id)
}
