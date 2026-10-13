import { generateDemoAlias, getDemoAlias } from './demoAlias'

const STORAGE_KEY = 'sil_demo_alias_v1'

describe('demo alias', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds noun_adjective_number from the word lists', () => {
    expect(generateDemoAlias(() => 0)).toBe('gato_castizo_10')
    expect(generateDemoAlias(() => 0.999999)).toBe('barquillo_madrugador_99')
  })

  it('stays inside the lists when the random source returns 1', () => {
    expect(generateDemoAlias(() => 1)).toBe('barquillo_madrugador_99')
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
    localStorage.setItem(STORAGE_KEY, 'erizo_veloz_42')
    expect(getDemoAlias()).toBe('erizo_veloz_42')
  })

  it('replaces a stored value that is not a generated nick', () => {
    localStorage.setItem(STORAGE_KEY, '<b>pyroxine</b>')
    const alias = getDemoAlias()
    expect(alias).toMatch(/^[a-z]+_[a-z]+_\d{2}$/)
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
