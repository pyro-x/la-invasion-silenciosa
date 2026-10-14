// Neighborhood bounds, shared by the map and the capture flow. The position
// itself comes from the live watch (src/lib/geoWatch.ts).

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
