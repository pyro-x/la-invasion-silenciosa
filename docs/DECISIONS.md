# Decision log

Lightweight project decision log (ADR-lite). Rules:

1. **Every non-obvious decision is recorded here in the same PR that
   implements it** — same law as the sync rule in AGENTS.md.
2. Each entry links its trail: ticket, commit and/or doc section.
3. Entries are never deleted; if a decision is reversed, a new entry is
   added referencing the old one.

Format: `## D-NNN · date · title (ticket)` with **Decision / Alternatives /
Why / Trail**.

> Product documents (`reglas-y-especificacion.md`, `brief-tecnico.md`) are
> written in Spanish for the neighborhood association — see D-014.

---

## D-001 · 2026-06-18 · Free-tier-first stack (pre-repo)

**Decision:** React 19 + TS + Vite + Tailwind v4 + shadcn + MapLibre on Supabase Free + Cloudflare Pages. A single router-style Edge Function.
**Alternatives:** Next.js, React Native, self-managed Node backend, self-hosting.
**Why:** zero cost, no infrastructure to maintain, PWA opens from a QR without installation. Details and rejected options in brief §7–§8.
**Trail:** technical brief §7, §8, §10, §13.

## D-002 · 2026-07-05 · Languages: code in English, product in Spanish (LCHP-1)

**Decision:** TS/SQL identifiers in English (`Sighting`, `point_events`…); UI strings in Spanish. (Scope for docs/commits revised by D-014.)
**Alternatives:** everything in Spanish, including code.
**Why:** the team will be Spanish, but Spanish identifiers create friction with libraries, examples and agents. The brief already defined the schema in English.
**Trail:** AGENTS.md §Languages · LCHP-1.

## D-003 · 2026-07-05 · No specs folder; two living documents (LCHP-1)

**Decision:** no `docs/sdd/`; `reglas-y-especificacion.md` + `brief-tecnico.md` are the living specs, with the sync rule (doc and code change in the same PR) and per-section `Decidido`/`[Explorando]` markers.
**Alternatives:** split the brief into numbered specs from day 0.
**Why:** rules and architecture are still evolving; splitting prematurely reorganizes content that has no final shape. A section graduates to its own spec only when code implements it or it churns too much.
**Trail:** AGENTS.md §Sync rule · brief (header legend).

## D-004 · 2026-07-05 · No moderation in the MVP: community validation (LCHP-1)

**Decision:** sightings are born `pending` and visible on the map (blinking marker); validation is community-driven, with no moderator or queue. `rejected`/`removed` states, `reports` and roles stay in the schema as an escape valve, without UI.
**Alternatives:** manual moderator approval with an approved-only map (the brief's original design, preserved as post-MVP reference in §5, §15, §20, §24, §36, §37).
**Why:** for a small neighborhood pilot, up-front moderation is friction without evidence of abuse; the golden rule + rate limits + a prepared schema are the containment. Matches what reglas-y-especificacion.md §5 always described.
**Trail:** brief (2026-07-05 amendment, multiple §§) · LCHP-1 · PR #1.

## D-005 · 2026-07-05 · Configurable validation threshold, 1 for the pilot (LCHP-10/12/15)

**Decision:** `app_config.validation_threshold`, seeded to `1`. The `pending → approved` transition fires when the threshold is reached.
**Alternatives:** hardcode 1 · fixed threshold ~3 (the mockup's seed data shows validated entries with 3–6 `votes`).
**Why:** with a small pilot, 3 confirmations might never arrive; raising the threshold later is a configuration change with no code or deploy, exactly as the mockup envisioned.
**Trail:** brief §14 (app_config), §15, §20, §36 · LCHP-10, LCHP-12, LCHP-15.

## D-006 · 2026-07-05 · Prototype: sources versioned, zip out (LCHP-1)

**Decision:** extract the JSX sources, `data.jsx`, `lalatina-geo.js` and logos from the Claude Design handoff into `docs/prototype/fuentes/`; the ~4 MB zip stays gitignored.
**Alternatives:** commit the zip · keep only the screenshots.
**Why:** agents read the sources directly (they are the mockup's behavioral spec) without putting 4 MB of binaries into history.
**Trail:** LCHP-1 · PR #1 · docs/prototype/claude-design-handoff.md.

## D-007 · 2026-07-05 · M1 ports ALL screens with typed fake services (LCHP-6..9)

**Decision:** the mockup's 7 screens as static UI in M1, consuming typed fake services using the real types from brief §14. Components never know whether a mock or Supabase sits behind them.
**Alternatives:** port each screen only when its backend exists.
**Why:** demoable to the association from week 1; the switch to Supabase (M2+) swaps service implementations without touching screens.
**Trail:** LCHP-6, LCHP-7, LCHP-8, LCHP-9.

## D-008 · 2026-07-05 · Cloudflare Pages deploy from M1, personal account (LCHP-19)

**Decision:** split deployment out of LCHP-17 (M6) and bring it forward to M1: public URL + per-PR previews + "sample data" banner. David's personal Cloudflare account until the association has one; migrate before printing the pilot QR.
**Alternatives:** deploy at the end (M6, as originally planned) · wait for the association's account.
**Why:** the M1 app has no backend or secrets → publishable at zero risk; the mobile spikes need real HTTPS; and verification infrastructure belongs at the start of a project, not the end.
**Trail:** LCHP-19, LCHP-17.

## D-009 · 2026-07-05 · Public repo + main branch protection (LCHP-2)

**Decision:** make the repo public and enable branch protection on `main`: PRs only, required green checks, `enforce_admins`, no force-push.
**Alternatives:** private without the lock (discipline by convention) · private + GitHub Pro (€4/month).
**Why:** GitHub Free only allows protection on public repos; the project is a neighborhood initiative and the app will be public anyway; no secrets in the repo by construction (gitleaks + ignored .env).
**Trail:** LCHP-2 (Linear comments) · repo settings.

## D-010 · 2026-07-05 · ESLint instead of oxlint (LCHP-2)

**Decision:** replace the oxlint shipped by the 2026 create-vite template with ESLint flat config + typescript-eslint + react-hooks + react-refresh + Prettier, with `no-explicit-any` as an error.
**Alternatives:** keep oxlint (faster, smaller rule ecosystem).
**Why:** the ticket specified ESLint; rule ecosystem and prior experience outweigh speed in a small repo.
**Trail:** LCHP-2 · PR #2 · eslint.config.js.

## D-011 · 2026-07-05 · No `baseUrl` in tsconfig (LCHP-2)

**Decision:** `@/*` alias with `paths` only; no `baseUrl`.
**Alternatives:** `baseUrl: "."` + `ignoreDeprecations`.
**Why:** TypeScript 6 deprecates `baseUrl` (error TS5101); with `moduleResolution: bundler`, `paths` works on its own.
**Trail:** LCHP-2 · PR #2 · tsconfig.app.json.

## D-012 · 2026-07-05 · Dependencies only when they have a consumer (LCHP-2)

**Decision:** React Router, TanStack Query and vite-plugin-pwa are NOT installed in the scaffold; they arrive with LCHP-6 (router/query) and LCHP-17 (PWA).
**Alternatives:** install the whole brief §7 stack at once.
**Why:** unused dependencies are audit noise and drift candidates; each ticket installs what it introduces.
**Trail:** LCHP-2 · PR #2.

## D-013 · 2026-07-05 · Playwright as a visual verification tool, not E2E (LCHP-20)

**Decision:** headless Playwright with a 412×892 viewport (the prototype's) to capture app screenshots and compare them against `docs/prototype/prototipo_en_imagenes/` during M1's autonomous development. Not an E2E suite (that remains optional post-MVP, brief §35). Does not run in CI.
**Alternatives:** driving the developer's Chrome (ties the loop to a human session) · pixel-diff comparison (would never converge: the app uses Tailwind/shadcn, not the prototype's CSS).
**Why:** deterministic autonomous loop; the judgment is structural/visual fidelity, not pixel equality.
**Trail:** LCHP-20 · scripts/screenshots.mjs.

## D-014 · 2026-07-05 · Languages split by audience after going public (LCHP-20)

**Decision:** with the repo now public — **English** for developer-facing artifacts: commits, PRs, code comments, README, AGENTS.md, this log, FINDINGS.md, CI. **Spanish** for the two product documents (`reglas-y-especificacion.md`, `brief-tecnico.md`), Linear (team management) and all UI strings. Pre-existing Spanish commits/PRs in history stay as they are.
**Alternatives:** everything in English including product docs (the association loses readability of its own rulebook) · Spanish everywhere (external contributors and tooling lose readability) · split by platform (GitHub EN / Linear ES) regardless of audience.
**Why:** the real readers decide the language. Developers and agents read commits/PRs/technical docs → English. Neighbors and the association read the game rules and the brief → Spanish. Agents handle the mix without any confusion; the split cost is zero for them.
**Trail:** LCHP-20 · AGENTS.md §Languages. *(Linear scope revised by D-015.)*

## D-015 · 2026-07-05 · Linear moves to English too (revises D-014)

**Decision:** Linear tickets, milestones and new comments are written in **English**. Spanish remains only for business/product material: the two product documents, UI strings, and the Linear project description (the product pitch). Existing Spanish comments stay as history. The `deuda` label is superseded by `tech-debt`.
**Alternatives:** keep Linear in Spanish as D-014 originally set (assumed "team management" audience).
**Why:** tickets, scope and milestones are managed by developers and agents — the same audience as the repo. They quote code, schema and endpoints; a Spanish wrapper around English content served no reader. Applying D-014's own audience principle consistently lands Linear on the English side.
**Trail:** LCHP-20 · AGENTS.md §Languages · Linear (milestones + all 20 tickets translated).

## D-016 · 2026-07-05 · Spanish route paths; prototype canvas coords until M3 (LCHP-6)

**Decision:** URL paths are user-visible, so they are Spanish (`/mapa`, `/especies`, `/cazar`, `/ranking`, `/perfil`); code identifiers stay English. The fake sightings service serves the prototype's canvas coordinates (1000×527 space over `lalatina-geo.js`) — they become real lat/lng when MapLibre lands (LCHP-13).
**Alternatives:** English paths (consistent with code, opaque to neighbors) · converting mock data to lat/lng now (pointless before MapLibre exists).
**Why:** the address bar is UI; the coordinate swap belongs to the ticket that changes the map engine.
**Trail:** LCHP-6 · src/app/router.tsx · src/types/sighting.ts.

## D-017 · 2026-07-05 · lucide icons for navigation; pixel sprites only for creatures (LCHP-6)

**Decision:** the bottom bar uses `lucide-react` icons (Map, BookOpen, Camera, Trophy, User). The prototype's pixel-art sprites are ported only for the creatures (they are product identity), arriving with the screens in LCHP-8.
**Alternatives:** port the prototype's pixel `NavIcon` sprites for the nav too.
**Why:** lucide is the locked icon library; nav icons are utilitarian while creature sprites are the game's soul. Halves the pixel-porting surface without losing recognizability (validated against captura_03 side by side).
**Trail:** LCHP-6 · src/components/layout/BottomNav.tsx.

## D-018 · 2026-07-05 · Self-hosted fonts; single "chispera" theme (LCHP-6)

**Decision:** fonts self-hosted via Fontsource (Space Grotesk body, Space Mono mono, Archivo Black display) — no Google Fonts CDN. Only the prototype's default theme ships (`chispera`, the brand palette); the other four prototype themes (neon, verbena, pop, campo) were design-exploration variants and are dropped.
**Alternatives:** Google Fonts links (what the prototype HTML used) · shipping the theme switcher.
**Why:** GDPR (Google Fonts CDN transfers visitor IPs; sanctioned in the EU) + the future PWA must work offline; one theme = one brand, and the tweaks panel was a design tool, not product.
**Trail:** LCHP-6 · src/styles/globals.css · package.json (@fontsource/*).
