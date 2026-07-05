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
**Trail:** LCHP-6 · src/components/layout/BottomNav.tsx. *(Reversed by D-019.)*

## D-018 · 2026-07-05 · Self-hosted fonts; single "chispera" theme (LCHP-6)

**Decision:** fonts self-hosted via Fontsource (Space Grotesk body, Space Mono mono, Archivo Black display) — no Google Fonts CDN. Only the prototype's default theme ships (`chispera`, the brand palette); the other four prototype themes (neon, verbena, pop, campo) were design-exploration variants and are dropped.
**Alternatives:** Google Fonts links (what the prototype HTML used) · shipping the theme switcher.
**Why:** GDPR (Google Fonts CDN transfers visitor IPs; sanctioned in the EU) + the future PWA must work offline; one theme = one brand, and the tweaks panel was a design tool, not product.
**Trail:** LCHP-6 · src/styles/globals.css · package.json (@fontsource/*).

## D-019 · 2026-07-05 · The M1 bar is a 100% visual replica; prototype CSS and sprites ship verbatim (reverses D-017)

**Decision:** David set the M1 acceptance bar explicitly: the app must be a visual clone of the Claude Design mockup, not an interpretation. Consequences: the prototype's stylesheet is ported **verbatim** (its class names — `.panel`, `.chip`, `.btn`, `.tabbar`, `.tab`, `.fab`, `.eyebrow`, `.scr-title`… — resolved to the chispera theme) instead of re-expressing it in Tailwind utilities; the pixel-art engine (`PixelSprite`/`MiniPix`/`CreatureSprite`/`NavIcon`) is ported as typed React components; the bottom bar uses the prototype's pixel icons, not lucide. Tailwind remains for layout glue only.
**Alternatives:** keep approximating with Tailwind + lucide (D-017) — produced a "similar but not the same" shell that failed David's review against the deployed mockup.
**Why:** with the mockup's own CSS, the clone is guaranteed by construction; with a reinterpretation it depends on a judge's eye. Verification bonus: the deployed mockup (demos.ixine.com) is byte-identical (SHA-256) to the handoff zip's offline HTML, and 9/11 embedded sources match `docs/prototype/fuentes/` exactly — the two that differ (`app.jsx`, `screens1.jsx`) only add URL deep-link plumbing, with zero visual delta.
**Trail:** LCHP-6 · src/styles/globals.css · src/components/pixel/ · PR #4.

## D-020 · 2026-07-05 · Golden-rule onboarding copy follows reglas §3.1, not the mockup string (LCHP-7)

**Decision:** the onboarding golden-rule paragraph adds «vecinos» to the mockup's `ob_rule_txt` so the list of protected people matches §3.1 (huéspedes, porteros, **vecinos** o trabajadores); the rest of the sentence is the mockup string verbatim.
**Alternatives:** ship the mockup string verbatim (100% replica, but it omits «vecinos», a category the product invariant protects).
**Why:** the ticket marks this text as the product invariant to carry faithfully from §3.1, and the sync rule makes the documents prescriptive over the prototype. The one extra word is the only copy divergence from the mockup in the whole PR.
**Trail:** LCHP-7 · reglas-y-especificacion.md §3.1 · src/pages/OnboardingPage.tsx.

## D-021 · 2026-07-05 · Onboarding is a route (`/onboarding`), gated at press-start (LCHP-7)

**Decision:** the onboarding ships as its own full-bleed route outside the AppShell. The press-start button resolves the first-visit gate (`localStorage['sil_onb_v1']`, the prototype's key) and navigates to `/onboarding` or `/mapa`; `?onboarding=1` (or `?intro=1`) on the home route forces it — same params and accepted values as the prototype's boot logic.
**Alternatives:** overlay state inside a single page (the prototype approach — it was a single-canvas mock with no router).
**Why:** the app is route-driven (D-016) and the visual loop (D-013) captures URLs, so the step must be addressable. The visual result is identical: the prototype's overlay was a `.screen` with `bottom: 0` covering the tabbar, which is exactly what the route renders.
**Trail:** LCHP-7 · src/app/router.tsx · src/lib/onboarding.ts (+ tests).

## D-022 · 2026-07-05 · Start-screen art is logo-chispera.png; onboarding judged against the JSX (LCHP-7)

**Decision:** the press-start emblem ships `logo-chispera.png` — the white-plate lockup the prototype's `StartScreen` actually references and `captura_01_inicio.png` shows — copied to `src/assets/`, not the raw `chispera-emblem.png`. The onboarding screen is judged against `screens1.jsx` (structure and inline values copied verbatim) because `captura_02_briefing.png` is mislabeled: it captures the map, so the onboarding has no reference image (flagged on LCHP-7 for its own tech-debt ticket).
**Alternatives:** `chispera-emblem.png` (raw transparent emblem — loses the plate and inner ring visible in the capture) · blocking on a fresh mockup capture.
**Why:** replica by construction means shipping the exact asset and values the mockup renders.
**Trail:** LCHP-7 · src/assets/logo-chispera.png · docs/prototype/prototipo_en_imagenes/captura_02_briefing.png.

## D-023 · 2026-07-05 · Species detail is a route, not in-component state (LCHP-8)

**Decision:** the Pokédex detail card renders at `/especies/:speciesId` (the route LCHP-6 already declared), instead of replicating the prototype's `useState`-based swap inside `PokedexScreen`. The back chip navigates to `/especies`; an unknown id redirects to the list.
**Alternatives:** keep the prototype's local `open` state (visually identical, but the detail would not be linkable and the existing route would stay dead).
**Why:** each species card gets a shareable/bookmarkable URL and the screenshot loop can capture details directly (`/especies/candadin`); zero visual delta with the mockup.
**Trail:** LCHP-8 · src/pages/SpeciesPage.tsx · src/pages/SpeciesDetailPage.tsx.

## D-024 · 2026-07-05 · «Verificar» CTAs ship inert in M1 (LCHP-8)

**Decision:** the map's verify buttons (pin popover and «Cerca de ti» rows) render exactly like the mockup but do nothing when tapped. No toast, no disabled state.
**Alternatives:** a "coming soon" toast (invents Spanish copy that exists nowhere in the prototype's I18N) · `disabled` attribute (visibly greys the button, diverging from the mockup) · opening the prototype's VerifyModal (that is LCHP-15's scope, M5).
**Why:** the ticket allows "disabled or simulated"; a no-op is the only option with zero visual divergence and zero invented copy. The community verification flow lands in M5.
**Trail:** LCHP-8 · src/pages/MapPage.tsx.

## D-025 · 2026-07-05 · Geo data committed as a generated typed TS module, whole dataset (LCHP-8)

**Decision:** `docs/prototype/fuentes/assets/lalatina-geo.js` is converted once (window assignment stripped, shape typed) into `src/components/map/lalatina-geo.ts` and committed, keeping the full dataset including the `places` index that StreetMap does not use yet.
**Alternatives:** import the prototype `.js` at build time (keeps `docs/` as a runtime dependency and needs an untyped side-effect import) · trim `places` (saves ~3 KB but amputates the asset LCHP-13 may want for labels/geocoding).
**Why:** the app must not execute files out of `docs/`; a committed typed module is greppable, type-checked and dies with LCHP-13 anyway (MapLibre replaces this dataset in M3).
**Trail:** LCHP-8 · src/components/map/lalatina-geo.ts · D-016.

## D-026 · 2026-07-05 · Success screen: brief §4 wording overrides the mockup's definitive «+10 pts» (LCHP-9)

**Decision:** the capture-flow success screen keeps the mockup's structure (PixelBurst, popped-in sprite, green chip, display title, muted subtitle, CTA) but corrects the copy: the chip reads «+10 pts pendientes» and the subtitle is the exact product string **«Avistamiento enviado · +10 puntos pendientes de validación»** (asserted verbatim by a unit test), replacing the mockup's «+10 PTS» chip and «Pendiente de validación por la comunidad.» line.
**Alternatives:** mockup copy verbatim (the D-019 replica default) · dropping the chip entirely.
**Why:** brief §4/§19 forbids presenting the +10 as definitive before community validation, and LCHP-9 makes this the one sanctioned copy deviation from the replica bar; keeping the chip but qualifying it preserves the mockup's visual rhythm without breaking the product rule.
**Trail:** LCHP-9 · brief §4, §19 · src/pages/HuntPage.tsx · src/pages/HuntPage.test.tsx.

## D-027 · 2026-07-05 · Prototype StreetMap ported now for the location step (LCHP-9)

**Decision:** the prototype's vector map of La Latina (screens1.jsx `StreetMap` over `lalatina-geo.js`) is ported as `src/components/map/StreetMap.tsx`, with the OSM geometry extracted verbatim to `src/components/map/lalatina-geo.json`, because the capture flow's step 3 previews the new pin on it (captura_11). LCHP-8's map screen can reuse the component; MapLibre replaces it in LCHP-13 (D-016).
**Alternatives:** a static placeholder for step 3 (fails the D-019 replica bar) · waiting for LCHP-8 to port it (couples this ticket to an unmerged sibling).
**Why:** the replica requires the real vector render, the component is self-contained, and shared UI belongs to whichever ticket needs it first.
**Trail:** LCHP-9 · src/components/map/ · D-016, D-019.

## D-028 · 2026-07-05 · Profile ships without «Modo asociación» and the certificate (LCHP-9)

**Decision:** ProfilePage omits the mockup's association-mode entry card and the «Explorador del mes» certificate panel; everything else replicates captures 20–21 (header with level and progress, per-action stats, captures per species, badges grid, points reminder).
**Alternatives:** render both as decorative dead UI to keep the pixel-perfect replica.
**Why:** both blocks are explicitly out of LCHP-9's scope (association mode and certificate are post-MVP); dead UI on a build demoable to the association invites taps that go nowhere and misrepresents the MVP's scope.
**Trail:** LCHP-9 · reglas-y-especificacion.md §4.2 · src/pages/ProfilePage.tsx.
## D-029 · 2026-07-06 · Cloudflare Workers static assets instead of Pages (LCHP-19)

**Decision:** deploy as a **Workers static-assets project** (`wrangler.jsonc`: assets directory `./dist`, `single-page-application` not-found handling) instead of classic Pages. Production URL becomes `la-invasion-silenciosa.<account>.workers.dev`; per-branch preview URLs come from "Builds for non-production branches".
**Alternatives:** classic Pages (what D-008 assumed) — its creation flow no longer appears in David's dashboard; Cloudflare is steering new projects to Workers.
**Why:** same capabilities we wanted from Pages (git builds, PR previews, free tier), on the platform Cloudflare actively develops. The `public/_redirects` file stays (harmless; Pages-specific) but the SPA fallback that actually applies is the wrangler `not_found_handling`.
**Trail:** LCHP-19 · wrangler.jsonc · D-008.
