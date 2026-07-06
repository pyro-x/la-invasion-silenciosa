import {
  cameraDenialGuidance,
  cameraPermissionState,
  gateSeenBefore,
  iosRememberTip,
  isIos,
  locationDenialGuidance,
  markGateSeen,
} from '@/lib/permissions'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Mobile Safari/537.36'
const IPADOS_AS_MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

function stubNavigator(overrides: Record<string, object | string | number>) {
  vi.stubGlobal('navigator', { ...navigator, ...overrides })
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('platform detection', () => {
  it('detects iPhone and iPadOS-masquerading-as-Mac', () => {
    stubNavigator({ userAgent: IPHONE_UA })
    expect(isIos()).toBe(true)
    stubNavigator({ userAgent: IPADOS_AS_MAC_UA, maxTouchPoints: 5 })
    expect(isIos()).toBe(true)
  })

  it('does not flag Android or a real desktop Mac', () => {
    stubNavigator({ userAgent: ANDROID_UA })
    expect(isIos()).toBe(false)
    stubNavigator({ userAgent: IPADOS_AS_MAC_UA, maxTouchPoints: 0 })
    expect(isIos()).toBe(false)
  })
})

describe('denial guidance points to the real settings path per platform', () => {
  it('iOS: Privacidad y seguridad → Localización → Sitios web de Safari (NOT «Ajustes → Safari»)', () => {
    stubNavigator({ userAgent: IPHONE_UA })
    const guidance = locationDenialGuidance()
    expect(guidance).toContain('Privacidad y seguridad')
    expect(guidance).toContain('Sitios web de Safari')
    expect(guidance).toContain('pin a mano')
    expect(cameraDenialGuidance()).toContain('Ajustes del sitio web')
  })

  it('elsewhere: the browser padlock', () => {
    stubNavigator({ userAgent: ANDROID_UA })
    expect(locationDenialGuidance()).toContain('candado')
    expect(cameraDenialGuidance()).toContain('candado')
  })

  it('the remember tip exists only on iOS (Safari re-asks per session there)', () => {
    stubNavigator({ userAgent: IPHONE_UA })
    expect(iosRememberTip()).toContain('Permitir')
    stubNavigator({ userAgent: ANDROID_UA })
    expect(iosRememberTip()).toBeNull()
  })
})

describe('camera permission state', () => {
  it('reads the Permissions API when available', async () => {
    stubNavigator({ permissions: { query: () => Promise.resolve({ state: 'granted' }) } })
    expect(await cameraPermissionState()).toBe('granted')
    stubNavigator({ permissions: { query: () => Promise.resolve({ state: 'prompt' }) } })
    expect(await cameraPermissionState()).toBe('prompt')
  })

  it('degrades to unknown when the query is unsupported (gate will show)', async () => {
    stubNavigator({ permissions: { query: () => Promise.reject(new TypeError('nope')) } })
    expect(await cameraPermissionState()).toBe('unknown')
  })
})

describe('gate seen flag', () => {
  it('remembers across calls and survives storage errors', () => {
    expect(gateSeenBefore()).toBe(false)
    markGateSeen()
    expect(gateSeenBefore()).toBe(true)
  })
})
