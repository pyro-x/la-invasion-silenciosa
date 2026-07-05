import { Link } from 'react-router'
import { PagePlaceholder } from './PagePlaceholder'

/** 4-step capture flow; the real flow lands in LCHP-9 (static) and LCHP-14 (live). */
export function HuntPage() {
  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-canvas">
      <div className="flex items-center justify-between p-4">
        <h1 className="font-display text-lg text-ink">Cazar</h1>
        <Link to="/mapa" aria-label="Cerrar" className="font-mono text-sm text-ink-dim">
          ✕
        </Link>
      </div>
      <PagePlaceholder eyebrow="Registrar avistamiento" title="Flujo de captura" ticket="LCHP-9" />
    </div>
  )
}
