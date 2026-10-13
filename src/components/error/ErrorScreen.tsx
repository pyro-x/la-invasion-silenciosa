// The app's own error screen (LCHP-52, D-068): what a neighbour sees in
// place of the router's default error dump, and for an unknown address.
// Inside the shell it fills the page area above the tab bar; `standalone`
// gives it the app frame when there is no shell around it.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { PixelSprite } from '@/components/pixel/PixelSprite'
import { ERROR_SPRITES, ERROR_SPRITE_PALETTES } from '@/components/pixel/errorSprites'
import { queryClient } from '@/lib/queryClient'
import { ERROR_COPY } from './errorCopy'

const MAP_PATH = '/mapa'

type ErrorScreenProps =
  | { variant: 'error'; reference: string; standalone?: boolean }
  | { variant: 'notFound'; standalone?: boolean }

export function ErrorScreen(props: ErrorScreenProps) {
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()

  const heading = useRef<HTMLHeadingElement>(null)

  // The screen replaces a page under the reader's feet, often while focus
  // sits on the tab that opened it: moving focus to the title is what makes
  // a screen reader say what happened.
  useEffect(() => {
    heading.current?.focus()
  }, [])

  const copy = ERROR_COPY[props.variant]
  const sprite = props.variant === 'error' ? 'glitch' : 'missing'
  const mapFailed = props.variant === 'error' && pathname === MAP_PATH

  // The router's boundary drops its error when the location object changes,
  // so going to the address we are already on renders the route again. (A
  // revalidation did not reset it: these routes have no loaders.) The cached remote data goes first: a page that
  // failed on what it had loaded would fail again on the same data. The
  // client is imported, not read from context: this screen must render
  // whatever is missing above it.
  function retry() {
    void queryClient.resetQueries()
    void navigate(pathname + search + hash, { replace: true })
  }

  const screen = (
    <div
      className="screen"
      style={{
        bottom: props.standalone ? 0 : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 28,
        gap: 14,
      }}
    >
      <div className="floaty">
        <PixelSprite grid={ERROR_SPRITES[sprite]} palette={ERROR_SPRITE_PALETTES[sprite]} />
      </div>
      <div className="eyebrow" style={{ marginTop: 6 }}>
        {copy.eyebrow}
      </div>
      <h1
        ref={heading}
        tabIndex={-1}
        className="display"
        style={{ fontSize: 22, lineHeight: 1.18, outline: 'none' }}
      >
        {copy.title}
      </h1>
      <p style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 320 }}>{copy.body}</p>
      <div className="stack" style={{ gap: 10, width: '100%', maxWidth: 320, marginTop: 6 }}>
        {props.variant === 'error' && (
          <button type="button" className="btn btn-accent" onClick={retry}>
            {ERROR_COPY.retry}
          </button>
        )}
        <button
          type="button"
          className={props.variant === 'error' ? 'btn' : 'btn btn-accent'}
          onClick={() => navigate(mapFailed ? '/' : MAP_PATH)}
        >
          {mapFailed ? ERROR_COPY.backToStart : ERROR_COPY.backToMap}
        </button>
      </div>
      {props.variant === 'error' && (
        <p
          className="mono"
          style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--ink-dim)', marginTop: 6 }}
        >
          {ERROR_COPY.referenceLabel}:{' '}
          <strong style={{ color: 'var(--ink)', letterSpacing: '0.06em' }}>
            {props.reference}
          </strong>
          <br />
          {ERROR_COPY.referenceHint}
        </p>
      )}
    </div>
  )

  if (!props.standalone) return screen
  return <div className="app-root mx-auto h-dvh max-w-md">{screen}</div>
}
