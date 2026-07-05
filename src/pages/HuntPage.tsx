import { Link } from 'react-router'

/** 4-step capture flow; real flow lands in LCHP-9 (static) and LCHP-14 (live). */
export function HuntPage() {
  return (
    <div className="app-root mx-auto h-dvh max-w-md">
      <div className="pad row" style={{ justifyContent: 'space-between' }}>
        <h1 className="display" style={{ fontSize: 18, margin: 0 }}>
          Cazar
        </h1>
        <Link to="/mapa" aria-label="Cerrar" className="chip chip-ghost">
          ✕
        </Link>
      </div>
      <div className="pad stack" style={{ gap: 12 }}>
        <div>
          <div className="eyebrow">Registrar avistamiento</div>
          <div className="scr-title" style={{ fontSize: 26 }}>
            Flujo de captura
          </div>
        </div>
        <div className="panel pad">
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Pantalla en construcción — llega con el ticket LCHP-9.
          </p>
        </div>
      </div>
    </div>
  )
}
