import { Link } from 'react-router'

/** Press-start screen; the full version (emblem, fullscreen) lands in LCHP-7. */
export function HomePage() {
  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-6 bg-canvas p-6 text-center">
      <p className="font-mono text-[10px] font-bold tracking-widest text-ink-dim uppercase">
        A.V. La Chispera · La Latina
      </p>
      <h1 className="font-display text-3xl text-ink">La Invasión Silenciosa</h1>
      <Link
        to="/mapa"
        className="rounded-app border-2 border-line bg-accent px-6 py-3 font-display text-sm text-on-accent"
        style={{ boxShadow: 'var(--shadow-app)' }}
      >
        Empezar la misión
      </Link>
    </div>
  )
}
