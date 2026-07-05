# La Invasión Silenciosa

**Touristification hunters · La Latina, Madrid** — an initiative by
**A.V. La Chispera**.

A citizen-science game as a mobile-first web app (PWA): neighbors
document the visible signs of touristification in their neighborhood —
represented as **creatures** — with a photo and an approximate location,
feeding a collective map. We document **creatures, never people**:
privacy is the project's golden rule.

## Status

In development — M1 (the full mockup as a working app on sample data).
The full roadmap lives in
[Linear](https://linear.app/ixine/project/la-invasion-silenciosa-mvp-5c9e727b8074)
(team `LCHP`).

Deployed automatically from `main` via Cloudflare Pages; every PR gets
its own preview URL (see the PR checks). The app runs on sample data
until M2+ (on-screen ribbon).

## Documentation

| Looking for… | Where |
|---|---|
| Game rules, points, screens *(Spanish)* | [`docs/product/reglas-y-especificacion.md`](docs/product/reglas-y-especificacion.md) |
| Technical architecture and decisions *(Spanish)* | [`docs/architecture/brief-tecnico.md`](docs/architecture/brief-tecnico.md) |
| Visual prototype (source of truth for UI) | [`docs/prototype/`](docs/prototype/claude-design-handoff.md) |
| How to work in this repo (humans and agents) | [`AGENTS.md`](AGENTS.md) |
| Decision log | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| Tech debt and findings | [`FINDINGS.md`](FINDINGS.md) |

Product documents are written in Spanish for the neighborhood
association; developer-facing artifacts are in English (see
`docs/DECISIONS.md`, D-014).

## Getting started

```bash
pnpm install
pnpm dev        # dev server
pnpm test       # unit tests (Vitest)
pnpm build      # typecheck + production build
```

## Stack (summary)

React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + MapLibre GL
JS, on Supabase (Postgres + RLS + private Storage + Edge Function) and
Cloudflare Pages. Zero-cost / free-tier first. Details and rationale in
the [technical brief](docs/architecture/brief-tecnico.md).
