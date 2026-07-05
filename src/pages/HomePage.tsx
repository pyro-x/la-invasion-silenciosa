import { Link } from 'react-router'

/** Press-start screen; full art (emblem, fullscreen trigger) lands in LCHP-7. */
export function HomePage() {
  return (
    <div className="app-root mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="eyebrow">A.V. La Chispera · La Latina</div>
      <h1 className="display" style={{ fontSize: 30, lineHeight: 1.15, margin: 0 }}>
        La Invasión Silenciosa
      </h1>
      <Link to="/mapa" className="btn btn-accent" style={{ width: 'auto', padding: '14px 26px' }}>
        Empezar la misión
      </Link>
    </div>
  )
}
