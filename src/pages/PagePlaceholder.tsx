/**
 * Temporary screen body used while each screen is ported from the
 * prototype (LCHP-7/8/9). Keeps the eyebrow/title structure so the shell
 * is navigable and screenshot-able from day 0.
 */
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
    <div className="flex flex-col gap-3 p-4">
      <div>
        <p className="font-mono text-[10px] font-bold tracking-widest text-ink-dim uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display text-xl text-ink">{title}</h1>
      </div>
      <div
        className="rounded-app border-2 border-line bg-card p-4"
        style={{ boxShadow: 'var(--shadow-app)' }}
      >
        <p className="text-sm text-ink-dim">
          Pantalla en construcción — llega con el ticket {ticket}.
        </p>
      </div>
    </div>
  )
}
