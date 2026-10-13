import { UNSAFE_ErrorResponseImpl as RouteErrorResponse } from 'react-router'
import { reportError, toError } from './errorReport'
import { APP_VERSION } from './version'

function referenceOf(error: Error) {
  return reportError({ error, source: 'caught' }).reference
}

describe('the reference code', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is three and three characters from an alphabet without I, L, O or U', () => {
    expect(referenceOf(new Error('boom'))).toMatch(/^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/)
  })

  it('is the same for the same failure on the same build', () => {
    expect(referenceOf(new TypeError('boom'))).toBe(referenceOf(new TypeError('boom')))
  })

  it('changes with the message and the kind of error', () => {
    const codes = new Set([
      referenceOf(new Error('boom')),
      referenceOf(new Error('bang')),
      referenceOf(new TypeError('boom')),
    ])
    expect(codes.size).toBe(3)
  })
})

describe('toError', () => {
  it('keeps an Error as it is', () => {
    const error = new RangeError('out')
    expect(toError(error)).toBe(error)
  })

  it('wraps anything else that was thrown', () => {
    expect(toError('plain text').message).toBe('plain text')
    expect(toError(undefined).message).toBe('undefined')
  })

  it('does not throw on a value with no string form', () => {
    const hostile = {
      toString(): string {
        throw new Error('no string for you')
      },
    }
    const bare: object = Object.create(null)
    expect(toError(bare).message).toBe('A value that is not an error was thrown')
    expect(toError(hostile).message).toBe('A value that is not an error was thrown')
  })

  it('names a route response by its status', () => {
    expect(toError(new RouteErrorResponse(503, 'Service Unavailable', null)).message).toBe(
      '503 Service Unavailable',
    )
  })
})

describe('reportError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes one entry with the code, the build, the pathname, both stacks and nothing else', () => {
    window.history.replaceState(null, '', '/especies/keymon?onboarding=1#top')
    const error = new Error('boom')

    const report = reportError({ error, componentStack: '\n    at Broken', source: 'caught' })

    expect(Object.keys(report).sort()).toEqual([
      'componentStack',
      'error',
      'reference',
      'route',
      'source',
      'version',
    ])
    expect(report).toMatchObject({
      version: APP_VERSION,
      route: '/especies/keymon',
      source: 'caught',
      componentStack: 'at Broken',
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    const [entry, logged] = vi.mocked(console.error).mock.calls[0]
    expect(logged).toBe(error)
    expect(entry).toContain(report.reference)
    expect(entry).toContain('route: /especies/keymon\n')
    expect(entry).not.toContain('onboarding=1')
    expect(entry).toContain('component stack: at Broken')
  })

  it('says so when there is no component stack', () => {
    reportError({ error: new Error('boom'), source: 'router' })
    expect(vi.mocked(console.error).mock.calls[0][0]).toContain('component stack: not available')
  })
})
