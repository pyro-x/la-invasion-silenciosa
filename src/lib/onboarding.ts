// First-visit onboarding gate, parity with the prototype's boot logic
// (app.jsx: `sil_onb_v1` key, forceable via ?onboarding=1 or ?intro=1).
const STORAGE_KEY = 'sil_onb_v1'

export function isOnboardingForced(search: string): boolean {
  const params = new URLSearchParams(search)
  const value = params.get('onboarding') ?? params.get('intro')
  return value !== null && value !== '0' && value !== 'false'
}

export function shouldShowOnboarding(search: string): boolean {
  if (isOnboardingForced(search)) return true
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // storage unavailable (private mode): onboarding shows again next visit
  }
}
