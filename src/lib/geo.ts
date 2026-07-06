// Geolocation + neighborhood bounds, shared by the capture flow.

// Client-side mirror of `isWithinNeighborhood` in the Edge Function
// (supabase/functions/api/lib/validation.ts): same LCHP-4 frame, same GPS
// margin. The server remains the authority; this only lets the location step
// block an out-of-bounds pin before a doomed submit.
const LA_LATINA_BBOX = {
  minLng: -3.7173,
  maxLng: -3.7068,
  minLat: 40.4093,
  maxLat: 40.4138,
} as const

const BBOX_MARGIN = 0.002

export function isWithinLaLatina(lat: number, lng: number): boolean {
  return (
    lat >= LA_LATINA_BBOX.minLat - BBOX_MARGIN &&
    lat <= LA_LATINA_BBOX.maxLat + BBOX_MARGIN &&
    lng >= LA_LATINA_BBOX.minLng - BBOX_MARGIN &&
    lng <= LA_LATINA_BBOX.maxLng + BBOX_MARGIN
  )
}

export type GeoFix =
  | { kind: 'ok'; lat: number; lng: number; accuracyM: number }
  | { kind: 'denied' }
  | { kind: 'unavailable' }

/**
 * One-shot position fix. Must be called from a user gesture (LCHP-5/LCHP-14
 * decision: the native permission prompt fires on tap, never on load).
 * Never rejects — denial and absence are ordinary outcomes with a manual-pin
 * fallback, not exceptions.
 */
export function getGeoFix(): Promise<GeoFix> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ kind: 'unavailable' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          kind: 'ok',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
      // code 1 = PERMISSION_DENIED (the constant itself may be absent in
      // non-browser test environments).
      (error) => resolve(error.code === 1 ? { kind: 'denied' } : { kind: 'unavailable' }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  })
}
