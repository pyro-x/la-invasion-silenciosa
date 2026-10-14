import {
  keepMapSession,
  mapSession,
  resetMapSessionForTests,
  retentionLeftMs,
  SESSION_RETENTION,
} from '@/lib/mapSession'
import { PLAY_RULES } from '@/lib/proximity'

const IN_BARRIO = { lat: 40.4115, lng: -3.712 }
const NOW = 1_800_000_000_000

describe('what the map keeps while another screen is on (LCHP-56)', () => {
  it('a position is kept no longer than the age at which the app calls it old', () => {
    expect(SESSION_RETENTION.fixMaxAgeMs).toBe(PLAY_RULES.stalePositionMs)
  })

  it('counts from when the position was read, not from when the screen was left', () => {
    expect(retentionLeftMs({ ...IN_BARRIO, at: NOW }, NOW)).toBe(SESSION_RETENTION.fixMaxAgeMs)
    expect(retentionLeftMs({ ...IN_BARRIO, at: NOW - 90_000 }, NOW)).toBe(30_000)
    expect(retentionLeftMs({ ...IN_BARRIO, at: NOW - SESSION_RETENTION.fixMaxAgeMs }, NOW)).toBe(0)
    expect(retentionLeftMs({ ...IN_BARRIO, at: NOW - 3_600_000 }, NOW)).toBe(0)
  })

  it('does not keep a position outside La Latina, however fresh', () => {
    expect(retentionLeftMs({ lat: 41.3874, lng: 2.1686, at: NOW }, NOW)).toBe(0)
  })

  it('starts following, with no view and no position seen, and goes back to that', () => {
    expect(mapSession()).toEqual({
      view: null,
      located: false,
      following: true,
      zoomSpent: false,
      streetOwed: false,
    })
    keepMapSession({ view: { center: [-3.712, 40.4115], zoom: 17 }, located: true })
    keepMapSession({ following: false })
    expect(mapSession()).toMatchObject({
      view: { center: [-3.712, 40.4115], zoom: 17 },
      located: true,
      following: false,
    })
    resetMapSessionForTests()
    expect(mapSession().view).toBeNull()
    expect(mapSession().located).toBe(false)
  })
})
