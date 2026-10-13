import { generateDemoAlias } from '@/lib/demoAlias'
import { getProfile } from './profile.service'
import { getWeeklyRanking } from './ranking.service'

describe('fake weekly ranking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists ten entries in rank order with the current player sixth', async () => {
    const ranking = await getWeeklyRanking()
    expect(ranking.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(ranking.filter((entry) => entry.isMe).map((entry) => entry.rank)).toEqual([6])
  })

  it('shows the same nick in the ranking and in the profile', async () => {
    const ranking = await getWeeklyRanking()
    const profile = await getProfile()
    expect(ranking.find((entry) => entry.isMe)?.alias).toBe(profile.alias)
  })

  it('never hands the player a nick another entry already uses', async () => {
    const ranking = await getWeeklyRanking()
    const rivals = new Set(ranking.filter((entry) => !entry.isMe).map((entry) => entry.alias))
    const edges = [0, 0.5, 0.999999].map((value) => generateDemoAlias(() => value))
    const samples = Array.from({ length: 500 }, () => generateDemoAlias())
    expect([...edges, ...samples].filter((alias) => rivals.has(alias))).toEqual([])
  })
})
