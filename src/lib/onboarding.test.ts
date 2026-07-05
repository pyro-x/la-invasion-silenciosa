import { isOnboardingForced, markOnboardingSeen, shouldShowOnboarding } from './onboarding'

describe('first-visit onboarding gate', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the onboarding on the first visit', () => {
    expect(shouldShowOnboarding('')).toBe(true)
  })

  it('skips the onboarding once seen', () => {
    markOnboardingSeen()
    expect(shouldShowOnboarding('')).toBe(false)
  })

  it('persists the seen flag under the prototype key', () => {
    markOnboardingSeen()
    expect(localStorage.getItem('sil_onb_v1')).toBe('1')
  })

  it('?onboarding=1 forces it even after being seen', () => {
    markOnboardingSeen()
    expect(shouldShowOnboarding('?onboarding=1')).toBe(true)
  })

  it('?intro=1 also forces it (prototype alias)', () => {
    markOnboardingSeen()
    expect(shouldShowOnboarding('?intro=1')).toBe(true)
  })

  it('?onboarding=0 and ?onboarding=false do not force it', () => {
    markOnboardingSeen()
    expect(shouldShowOnboarding('?onboarding=0')).toBe(false)
    expect(shouldShowOnboarding('?onboarding=false')).toBe(false)
  })

  it('isOnboardingForced only reacts to the force params', () => {
    expect(isOnboardingForced('')).toBe(false)
    expect(isOnboardingForced('?onboarding')).toBe(true)
    expect(isOnboardingForced('?onboarding=1')).toBe(true)
    expect(isOnboardingForced('?onboarding=0')).toBe(false)
  })
})
