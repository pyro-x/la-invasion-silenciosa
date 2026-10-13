import { UNSAFE_ErrorResponseImpl as RouteErrorResponse } from 'react-router'
import { errorReference, reportError, toError } from './errorReport'
import { APP_VERSION } from './version'

describe('errorReference', () => {
  it('is three and three characters from an alphabet without I, L, O or U', () => {
    expect(errorReference(new Error('boom'))).toMatch(
      /^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/,
    )
  })

  it('is the same for the same failure on the same build', () => {
    expect(errorReference(new TypeError('boom'))).toBe(errorReference(new TypeError('boom')))
  })

  it('changes with the message, the kind of error and the build', () => {
    const codes = new Set([
      errorReference(new Error('boom')),
      errorReference(new Error('bang')),
      errorReference(new TypeError('boom')),
      errorReference(new Error('boom'), 'v9.9.9+abcdef0'),
    ])
    expect(codes.size).toBe(4)
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
      reference: errorReference(error),
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
