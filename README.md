# La Invasión Silenciosa

**Cazadores de turistificación · La Latina, Madrid** — una iniciativa de la
**A.V. La Chispera**.

Juego de ciencia ciudadana en forma de app web mobile-first (PWA): los vecinos
documentan las señales visibles de la turistificación del barrio —representadas
como **criaturas**— con foto y ubicación aproximada, alimentando un mapa
colectivo. Se documentan **criaturas, nunca personas**: la privacidad es la
regla de oro del proyecto.

## Estado

En desarrollo — fase de bootstrap (M0). El roadmap completo vive en
[Linear](https://linear.app/ixine/project/la-invasion-silenciosa-mvp-5c9e727b8074)
(equipo `LCHP`).

## Documentación

| Qué buscas | Dónde está |
|---|---|
| Reglas del juego, puntos, pantallas | [`docs/product/reglas-y-especificacion.md`](docs/product/reglas-y-especificacion.md) |
| Arquitectura técnica y decisiones | [`docs/architecture/brief-tecnico.md`](docs/architecture/brief-tecnico.md) |
| Prototipo visual (fuente de verdad de UI) | [`docs/prototype/`](docs/prototype/claude-design-handoff.md) |
| Cómo trabajar en este repo (humanos y agentes) | [`AGENTS.md`](AGENTS.md) |
| Deuda técnica y hallazgos | [`FINDINGS.md`](FINDINGS.md) |

## Cómo arrancar

Todavía no hay aplicación que arrancar — el scaffold llega con
[LCHP-2](https://linear.app/ixine/issue/LCHP-2). Cuando exista:

```bash
pnpm install
pnpm dev
```

## Stack (resumen)

React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + MapLibre GL JS,
sobre Supabase (Postgres + RLS + Storage privado + Edge Function) y Cloudflare
Pages. Coste cero / free-tier first. Detalle y justificación en el
[brief técnico](docs/architecture/brief-tecnico.md).
