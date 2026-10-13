import { generateDemoAlias, getDemoAlias } from './demoAlias'

const STORAGE_KEY = 'sil_demo_alias_v1'

describe('demo alias', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds word_number from the word list', () => {
    expect(generateDemoAlias(() => 0)).toBe('gato_100')
    expect(generateDemoAlias(() => 0.999999)).toBe('coco_999')
  })

  it('stays inside the list when the random source returns 1', () => {
    expect(generateDemoAlias(() => 1)).toBe('coco_999')
  })

  it('fits the ranking row: eight characters at most', () => {
    const aliases = Array.from({ length: 500 }, () => generateDemoAlias())
    expect(Math.max(...aliases.map((alias) => alias.length))).toBeLessThanOrEqual(8)
  })

  it('gives different devices different nicks', () => {
    const aliases = new Set(Array.from({ length: 200 }, () => generateDemoAlias()))
    expect(aliases.size).toBeGreaterThan(150)
  })

  it('persists the nick so the device keeps it across visits', () => {
    const alias = getDemoAlias()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(alias)
    expect(getDemoAlias()).toBe(alias)
  })

  it('returns the stored nick of a returning device', () => {
    localStorage.setItem(STORAGE_KEY, 'lobo_342')
    expect(getDemoAlias()).toBe('lobo_342')
  })

  it('replaces a stored value that is not a generated nick', () => {
    localStorage.setItem(STORAGE_KEY, '<b>pyroxine</b>')
    const alias = getDemoAlias()
    expect(alias).toMatch(/^[a-z]{3,4}_\d{3}$/)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(alias)
  })

  it('keeps one nick for the page session when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    expect(getDemoAlias()).toBe(getDemoAlias())
  })
})
