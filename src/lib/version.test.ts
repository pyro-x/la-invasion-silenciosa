import { APP_VERSION } from '@/lib/version'

describe('app version string', () => {
  it('composes semver + build metadata (vX.Y.Z+sha)', () => {
    expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+\+([0-9a-f]{7,40}|dev)$/)
  })
})
