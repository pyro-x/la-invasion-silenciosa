// Permission plumbing for the capture flow (LCHP-28): platform detection,
// camera permission state, and the per-platform recovery guidance the gate
// and steps show after a denial. Research notes: Safari's Permissions API is
// reliable for `camera` but broken for `geolocation` (reports 'prompt' when
// denied), and iOS Safari does not persist camera grants across page loads —
// so the gate re-arms whenever a native prompt is actually coming.

export function isIos(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ masquerades as macOS but exposes multi-touch.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** Rear-camera request shared by the gate and the viewfinder — asking with
 * identical constraints means one grant covers both. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } },
  audio: false,
}

export type CameraPermission = 'granted' | 'prompt' | 'denied' | 'unknown'

export async function cameraPermissionState(): Promise<CameraPermission> {
  try {
    // 'camera' is in the spec and shipping in every target browser, but not
    // yet in TypeScript's PermissionName union — hence the descriptor cast.
    const status = await navigator.permissions.query({ name: 'camera' } as PermissionDescriptor)
    return status.state
  } catch {
    return 'unknown' // unsupported query → let the gate show and ask for real
  }
}

/** Correct recovery path per platform (the old copy sent iOS users to
 * «Ajustes → Safari», which has no location entry — David hit this live). */
export function locationDenialGuidance(): string {
  return isIos()
    ? 'Sin permiso de ubicación. En el iPhone: Ajustes → Privacidad y seguridad → Localización → Sitios web de Safari → «Preguntar» (o en Safari: ᴀA → Ajustes del sitio web → Ubicación). O coloca el pin a mano arrastrando el mapa.'
    : 'Sin permiso de ubicación. Permítela desde el candado de la barra del navegador — o coloca el pin a mano arrastrando el mapa.'
}

export function cameraDenialGuidance(): string {
  return isIos()
    ? 'Sin permiso de cámara. En Safari: ᴀA → Ajustes del sitio web → Cámara → «Preguntar» o «Permitir». Mientras tanto puedes usar la cámara del sistema o la galería.'
    : 'Sin permiso de cámara. Permítela desde el candado de la barra del navegador — o usa la cámara del sistema o la galería.'
}

/** iOS Safari re-asks every session unless the user sets per-site «Allow»;
 * returning iOS users get this one-line tip to make grants permanent. */
export function iosRememberTip(): string | null {
  return isIos()
    ? '¿Quieres que Safari lo recuerde? ᴀA → Ajustes del sitio web → Cámara y Ubicación → «Permitir».'
    : null
}

const GATE_SEEN_KEY = 'lis.equipment-gate.seen'

export function gateSeenBefore(): boolean {
  try {
    return localStorage.getItem(GATE_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markGateSeen(): void {
  try {
    localStorage.setItem(GATE_SEEN_KEY, '1')
  } catch {
    // storage unavailable (private mode quota) — the tip just won't show
  }
}
