import {
  distanceMeters,
  formatMeters,
  isVague,
  PLAY_RULES,
  presenceAt,
  roundedDistance,
} from './proximity'

const plaza = { lat: 40.4115, lng: -3.712 }
// one thousandth of a degree of latitude is 111.2 m anywhere
const north = (meters: number) => ({ lat: plaza.lat + meters / 111_195, lng: plaza.lng })

describe('rules of presence', () => {
  it('measures metres between two points of the barrio', () => {
    expect(distanceMeters(plaza, plaza)).toBe(0)
    expect(distanceMeters(plaza, north(50))).toBeCloseTo(50, 1)
    // a degree of longitude is shorter at Madrid's latitude
    expect(distanceMeters(plaza, { lat: plaza.lat, lng: plaza.lng + 0.001 })).toBeCloseTo(84.7, 0)
  })

  it('the verification radius is the capture radius plus the public grid', () => {
    expect(PLAY_RULES.verifyRadiusM).toBe(PLAY_RULES.captureRadiusM + 35)
  })

  it('near inside the radius, far outside it, edge included', () => {
    const me = { ...plaza, accuracyM: 12 }
    expect(presenceAt(me, north(49), 50).kind).toBe('near')
    expect(presenceAt(me, north(51), 50)).toMatchObject({ kind: 'far' })
    expect(presenceAt(me, plaza, 0)).toEqual({ kind: 'near', distanceM: 0 })
  })

  it('a position too vague places nobody, however close the target', () => {
    const me = { ...plaza, accuracyM: 151 }
    expect(isVague(me)).toBe(true)
    expect(isVague({ ...me, accuracyM: 150 })).toBe(false)
    expect(presenceAt(me, plaza, 50)).toEqual({ kind: 'vague', accuracyM: 151 })
  })

  it('without a position nothing is near', () => {
    expect(presenceAt(null, plaza, 50)).toEqual({ kind: 'unknown' })
  })

  it('writes metres and kilometres the Spanish way', () => {
    expect(formatMeters(12.4)).toBe('12 m')
    expect(formatMeters(1240)).toBe('1,2 km')
  })

  it('rounds a distance to a public pin to tens of metres, never to nothing', () => {
    expect(roundedDistance(84)).toBe(80)
    expect(roundedDistance(3)).toBe(10)
    expect(roundedDistance(1249)).toBe(1250)
  })
})
