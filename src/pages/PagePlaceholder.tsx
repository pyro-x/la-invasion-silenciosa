// Temporary screen body (replaced by LCHP-7/8/9), using the prototype's
// exact classes so typography and spacing already match the mockup.
export function PagePlaceholder({
  eyebrow,
  title,
  ticket,
}: {
  eyebrow: string
  title: string
  ticket: string
}) {
  return (
    <div className="screen">
      <div className="pad stack" style={{ gap: 12 }}>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <div className="scr-title" style={{ fontSize: 26 }}>
            {title}
          </div>
        </div>
        <div className="panel pad">
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Pantalla en construcción — llega con el ticket {ticket}.
          </p>
        </div>
      </div>
    </div>
  )
}
