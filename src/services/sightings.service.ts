// Typed fake service (D-007): prototype sightings (data.jsx). Coordinates
// are prototype canvas coords until MapLibre lands in LCHP-13 (D-016).
import type { CaptureLocation, MapSighting, NewSighting } from '@/types/sighting'

const SIGHTINGS: MapSighting[] = [
  {
    id: 'A-204',
    speciesId: 'candadin',
    x: 660,
    y: 221,
    street: 'Cava Baja, 12',
    reportedBy: 'lola_rastrea',
    reportedAgo: 'hace 2 h',
    status: 'approved',
    verificationCount: 4,
  },
  {
    id: 'A-209',
    speciesId: 'keymon',
    x: 710,
    y: 116,
    street: 'Calle del Almendro',
    reportedBy: 'el_vecino_z',
    reportedAgo: 'hace 4 h',
    status: 'approved',
    verificationCount: 6,
  },
  {
    id: 'A-211',
    speciesId: 'turistox',
    x: 560,
    y: 84,
    street: 'Plaza de la Paja',
    reportedBy: 'mapache_42',
    reportedAgo: 'hace 5 h',
    status: 'approved',
    verificationCount: 3,
  },
  {
    id: 'A-215',
    speciesId: 'checkinchu',
    x: 850,
    y: 311,
    street: 'Calle de Toledo, 30',
    reportedBy: 'pyroxine',
    reportedAgo: 'hace 1 d',
    status: 'approved',
    verificationCount: 5,
  },
  {
    id: 'A-220',
    speciesId: 'candadin',
    x: 570,
    y: 274,
    street: 'Plaza de los Carros',
    reportedBy: 'rosa_lat',
    reportedAgo: 'hace 20 m',
    status: 'pending',
    verificationCount: 1,
  },
  {
    id: 'A-221',
    speciesId: 'turistox',
    x: 960,
    y: 321,
    street: 'Plaza de Cascorro',
    reportedBy: 'curro88',
    reportedAgo: 'hace 35 m',
    status: 'pending',
    verificationCount: 0,
  },
  {
    id: 'A-223',
    speciesId: 'keymon',
    x: 660,
    y: 248,
    street: 'Cava Alta, 7',
    reportedBy: 'marta_v',
    reportedAgo: 'hace 1 h',
    status: 'pending',
    verificationCount: 2,
  },
]

export async function listMapSightings(): Promise<MapSighting[]> {
  return SIGHTINGS
}

export async function listPendingSightings(): Promise<MapSighting[]> {
  return SIGHTINGS.filter((s) => s.status === 'pending')
}

// Fake approximate location for the capture flow (prototype's hardcoded spot);
// real geolocation lands in M4 (LCHP-5 spike).
const APPROX_LOCATION: CaptureLocation = {
  street: 'Calle de la Cava Baja · La Latina',
  shortStreet: 'Cava Baja',
  x: 710,
  y: 225,
}

export async function getApproxLocation(): Promise<CaptureLocation> {
  return APPROX_LOCATION
}

let nextSightingNumber = 224

/** Fake submit: appends the sighting as pending to the in-memory map data. */
export async function submitSighting(draft: NewSighting): Promise<MapSighting> {
  const sighting: MapSighting = {
    ...draft,
    id: `A-${nextSightingNumber++}`,
    reportedBy: 'pyroxine',
    reportedAgo: 'ahora mismo',
    status: 'pending',
    verificationCount: 0,
  }
  SIGHTINGS.push(sighting)
  return sighting
}
