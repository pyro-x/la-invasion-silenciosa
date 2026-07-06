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
**Trail:** LCHP-19 · wrangler.jsonc · D-008. *(Reversed by D-030 — merged by mistake after the plan was already discarded.)*

## D-030 · 2026-07-06 · Classic Cloudflare Pages after all (reverses D-029)

**Decision:** the deploy is **classic Cloudflare Pages** (David found the Pages flow in the dashboard after D-029 was drafted): production at https://la-invasion-silenciosa.pages.dev, build `pnpm run build` → `dist`, per-PR preview URLs, SPA fallback via `public/_redirects` — exactly D-008's original plan. `wrangler.jsonc` removed.
**Alternatives:** keep the Workers static-assets setup (D-029) — drafted while the Pages flow seemed unavailable; its PR was accidentally merged after the plan had been discarded.
**Why:** Pages was already working (first deploy green, externally verified: root + deep links 200) before the stray merge; one platform, one config.
**Trail:** LCHP-19 · PR #12 (accidental) reverted here · README (live URL).

## D-031 · 2026-07-06 · Canvas geodata retired at LCHP-13; seeds convert via affine transform (LCHP-4)

**Decision:** the MapLibre + OSM raster stack is confirmed for the MVP with spike evidence (brief §21, now verified). The prototype's `lalatina-geo` canvas geometry (1000×527 space, D-016) **cannot overlay real tiles** — a best-fit affine transform (9 plaza anchors, Nominatim-geocoded) leaves 4–39 m residuals (RMS ~25 m), visibly cutting through buildings at z17 — so it is retired when MapLibre lands: OSM tiles already draw the streets. Canvas-space sighting seeds are converted once via the fitted affine transform (documented in §21; acceptable because the product shows approximate locations by design) or re-seeded by hand; the map frame uses the fitted bbox `[[-3.7173, 40.4093], [-3.7068, 40.4138]]`. The §21 `tileProvider` sketch is upgraded to a discriminated union (`kind: 'raster' | 'vector'`) with a `buildMapStyle()` that was exercised verbatim in the spike page.
**Alternatives:** overlaying the canvas streets on MapLibre via the affine transform (rejected: visible misalignment, and redundant — tiles already render streets) · re-seeding every mock sighting by hand (kept as fallback; more work, no accuracy need) · keeping nullable `styleUrl`/`rasterTiles` fields in the config (rejected: orphan fields, worse typing).
**Why:** the spike's numbers say the transform is fine for approximate points but not for line geometry at high zoom; retiring the canvas layer removes an entire dataset instead of maintaining a lossy projection of it.
**Trail:** LCHP-4 · brief-tecnico.md §21–§23 · D-016 · LCHP-13 (implementer).

## D-032 · 2026-07-06 · Anonymous sightings allowed in the MVP; quota enforced by Postgres trigger (LCHP-3)

**Decision:** anonymous users CAN create sightings from their first submission (no magic link gate); the per-day quota (2/day anonymous, 5/day registered, brief §30) is enforced in Postgres with a `BEFORE INSERT` trigger calling a `security definer` function that counts the user's rows for the current day and picks the quota from the JWT's `is_anonymous` claim. The Edge Function may pre-check for friendlier errors, but the trigger is the source of truth.
**Alternatives:** require magic link from the first submission (kills first-touch participation in a neighborhood pilot; unnecessary — the upgrade preserves `user.id`, so nothing is lost by starting anonymous) · enforce the quota only in the Edge Function (bypassable via direct PostgREST; weaker guarantee than the data layer).
**Why:** verified against the real free-tier project (LCHP-3 spike): real anonymous sessions work (`is_anonymous=true` claim, 1 h JWT + refresh, permanent `auth.users` row), the anonymous→registered upgrade keeps the same `user.id` end-to-end (magic-link email followed on a local stack), RLS policies distinguish both types via the claim, and the trigger blocked the 3rd anonymous / 6th registered insert of the day in live tests.
**Trail:** LCHP-3 · brief §16, §30, §32 (enmiendas 2026-07-06) · PR of this spike.
## D-033 · 2026-07-06 · Cross-model adversarial review before PRs (workflow-wide)

**Decision:** before opening a PR, the branch gets a **Codex (GPT) adversarial review** via `/codex:adversarial-review --base origin/main` — a challenge to the approach and assumptions, not just a defect pass. Mandatory for the security-critical zone (RLS/Storage/Edge Function auth/golden-rule surface) and substantive feature PRs; optional for trivial docs/chores. Every finding is triaged in the PR body (fixed / ticketed / dismissed-with-reason); design-changing findings also enter this log.
**Alternatives:** same-model review only (blind spots shared with the author model) · human-only review (David is one person).
**Why:** the trial run on the LCHP-5 spike rig immediately caught a high-severity flaw no prior pass had seen (iOS HEIC samples silently treated as analyzed, which would have invalidated the next day's device conclusions) plus two evidence-quality gaps. A second model with a different training lineage sees different failure modes — cheap insurance at PR cadence.
**Trail:** AGENTS.md §Linear and GitHub + §stop-and-ask · LCHP-5 rig commit "address Codex adversarial-review findings" · David's request 2026-07-06.

## D-034 · 2026-07-06 · State fields are text + CHECK, not Postgres enums (LCHP-10)

**Decision:** every state/vocabulary column (`sightings.moderation_status`, `sightings.confidence`, `profiles.role`, `point_events.type`, `verifications.type/status`, `reports.reason/status`, `species.rarity`) is `text` with a `CHECK (col IN (…))` constraint instead of a native enum type.
**Alternatives:** `CREATE TYPE … AS ENUM` (native enums) · unconstrained text.
**Why:** the schema is deliberately created in full as an escape valve (AGENTS.md §ceiling), so vocabularies WILL evolve; changing a CHECK is a drop+add in one migration, while enums need `ALTER TYPE` ceremony (no removal, ordering quirks, in-transaction limits on older PG). Unconstrained text loses data integrity for zero gain.
**Known trade-off (Codex adversarial review, LCHP-10):** `supabase gen types` emits literal unions only for native enums — CHECK-backed columns come out as plain `string` in `src/types/database.ts`. Accepted: the app never consumes the generated row types directly; screens depend on hand-authored view-model types through the service layer (D-007), which keep the literal unions, and state transitions are created exclusively server-side (brief §15, LCHP-12/15) where the CHECK is the enforcement. If M3+ wiring ever exposes the widened fields to app code, narrow them there (e.g. a typed override of `Database`), not by migrating to enums.
**Trail:** LCHP-10 · supabase/migrations/0001_initial_schema.sql · brief §14 · src/types/database.ts.

## D-035 · 2026-07-06 · PostGIS enabled from day 0; MVP columns stay plain doubles (LCHP-10)

**Decision:** `create extension postgis with schema extensions` ships in the initial migration, but `sightings` keeps `lat_public/lng_public/lat_private/lng_private` as `double precision` (brief §14).
**Alternatives:** no PostGIS until a feature needs it · geography columns from day 0.
**Why:** the brief §7 backend list already includes PostGIS and enabling it costs nothing on the free tier, while enabling it later would gate an M3+ feature (distance/nearby queries) on a migration touching a live table. Geography columns now would force every insert path through PostGIS types for an MVP that only reads/writes plain coordinates; a generated column or backfill can add them when a query actually needs them.
**Trail:** LCHP-10 · supabase/migrations/0001_initial_schema.sql · brief §7, §21.

## D-036 · 2026-07-06 · Cloudflare Pages build watch paths — docs-only commits don't rebuild (infra)

**Decision:** Cloudflare Pages "Build watch paths" is set to **Include-only**: `src/*`, `public/*`, `index.html`, `vite.config.ts`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`. Commits that touch only documentation (`docs/`, `*.md`, `.github/`, this log) no longer trigger a Cloudflare build or deployment — neither production nor PR preview.
**Correction (2026-07-06, caught by the LCHP-11 PR):** the list was first configured with gitignore-style `src/**`/`public/**` — but Cloudflare's watch-path matcher uses **single-star globs** (`*` crosses path segments; see the dialog's own examples: `apps/*`, `*/tests`). With `**` nothing ever matched, so ALL builds were silently skipped — a `src/`-touching PR produced no build, which is how it was caught. The negative smoke test (docs PR skipping) had passed vacuously: it could not distinguish "docs correctly skipped" from "everything skipped". Lesson: a positive control (a build that SHOULD happen) is part of any allowlist test. GitHub Actions (Quality build·lint·format·test + gitleaks) still run on every commit: watch paths are a Cloudflare-only setting and do not touch the required merge checks.
**Alternatives:** `[Skip CI]` / `[CI Skip]` in the commit message (rejected — **not** Cloudflare-specific: GitHub Actions honors the same tokens, so it would also skip the required Quality + gitleaks checks, potentially leaving PRs unmergeable or bypassing secret scanning) · Cloudflare REST API / `wrangler` to set it agentically (rejected — `wrangler` does not manage Git build-integration settings, and there is no Cloudflare API token in the dev environment; the dashboard toggle is simpler and lives with David's account) · do nothing (the 500 builds/month free tier is ample, but the bootstrap-day cadence of ~23 PRs showed docs churn burns builds for zero user-visible change).
**Why:** a docs-only deploy is idempotent — identical assets, nothing new for users — yet still consumes the free-tier build budget. Include-path scoping trims exactly that redundant rebuild while leaving the GitHub Actions merge gate fully intact.
**Trail:** Cloudflare dashboard → Settings → Builds → Build watch paths (set by David 2026-07-06) · the PR carrying this entry is the docs-only smoke test (Cloudflare should skip; GitHub Actions should run) · AGENTS.md stack table (Cloudflare Pages).

## D-037 · 2026-07-06 · Hybrid PostgREST-first: Edge Function only where structurally needed (LCHP-11)

**Decision:** the client↔backend split is **PostgREST-first**: all reads (map view, species, own profile, future ranking) and the verification INSERT go directly through PostgREST guarded by RLS; exactly two operations go through the Edge Function — `/create-sighting` (photo bytes + row, atomically, `pending` enforced server-side) and `/get-photo-url` (short-lived signed URL). `sightings`, `point_events`, `reports`, `app_config` and the storage bucket carry **zero client policies**. Invariants live in Postgres regardless of path (quota trigger D-032, CHECKs, UNIQUE, consolidation trigger): the Edge Function is a capability layer, not the security boundary.
**Alternatives:** 100% PostgREST (direct bucket upload with own-uid path policy + predictable photo paths + storage SELECT policy) — feasible, saves the Edge Function in the MVP, but no server-side code ever sees the photo bytes (the golden-rule asset), it adds 2–3 complex policies to the security-critical zone, and post-MVP Fase A (Turnstile, a server-side secret) demolishes the direct write path anyway · routing everything through the Edge Function (a mini-backend: cold starts on reads, more imperative code, exactly what the stack rejected).
**Why:** David questioned the Edge dependency during LCHP-11; a full-roadmap analysis (M2→M7 + brief §37 Fases A–G) showed every future server-side need (Turnstile, auto-moderation APIs, blur/OCR) lands on the photo-write path — the two endpoints the plan already had — while reads and game actions never need one. The split is the minimal structural dependency, not convenience.
**Trail:** LCHP-11 (plan comment) · brief §12 (mirror), §13, §17 · LCHP-12/14 scopes · D-032.

## D-038 · 2026-07-06 · Verifications: direct client INSERT under RLS; consolidation by server-side trigger (LCHP-11, affects LCHP-15)

**Decision:** `verifications` INSERT is the single open client write path: RLS `WITH CHECK (user_id = auth.uid() AND NOT is_anonymous AND verification_target_is_valid(sighting_id, auth.uid()))`, column-scoped GRANT (`sighting_id, user_id, type, note` — `status`/`points_awarded` can never be client-supplied), uniqueness via the schema's `UNIQUE (sighting_id, user_id)`. The sensitive consolidation (verification_count, threshold check, `pending → approved`, +10/+5 point events) runs server-side as a Postgres trigger (LCHP-15), same pattern as the D-032 quota trigger. **Anonymous sessions cannot verify**: brief §16 lists verifying under the registered role, and with `validation_threshold = 1` an anonymous verifier would make self-validation via a second incognito session trivial (the sybil cost must be at least an email). **Target invariants live at the database boundary from day 0** (Codex adversarial review round 1, HIGH): only currently-`pending` sightings accept verifications, and never from their own author (`created_by is distinct from auth.uid()` inside a `security definer` helper, since the policy's subquery must read `sightings`, which clients cannot) — otherwise the author of a pending sighting could self-approve at threshold 1 and forge the +10/+5. **The helper lives in the non-exposed `private` schema and takes no verifier parameter** (round 2, medium): in `public` with an arbitrary-uuid parameter, PostgREST serves it as an RPC and any authenticated client could probe "was sighting X created by user Y?" — the very `created_by` linkage the map view withholds; deriving the verifier from `auth.uid()` internally means the function can only answer about the caller themself, and the schema move removes the RPC surface entirely (both covered by catalog tests). **Concurrency contract for LCHP-15** (round 2, medium): the `WITH CHECK` proves the target was pending in the statement snapshot but does not serialize concurrent verifications — the consolidation trigger must lock the sighting row (or `UPDATE … WHERE moderation_status = 'pending'` atomically) and award points only when that transition succeeds, with a concurrency regression test at threshold 1.
**Alternatives:** `POST /verify-sighting` Edge route doing insert + consolidation (LCHP-15's original wording, brief §13) — more imperative code for logic that is purely relational; the endpoint slot stays reserved in the router if friendlier errors are ever needed · allowing anonymous verifiers (rejected: sybil-cheap self-validation at threshold 1).
**Why:** the trigger runs inside the INSERT's own transaction (atomicity for free), keeps the Edge Function thin, and Postgres-level enforcement holds for every entry path. David chose it explicitly during LCHP-11 planning; LCHP-15 was notified in a ticket comment.
**Trail:** LCHP-11 · LCHP-15 (comment 2026-07-06) · supabase/migrations/0004 · brief §12, §16 · D-032.

## D-039 · 2026-07-06 · Conversation with David has no fixed language (amends D-014's scope)

**Decision:** Spanish stops being the default for conversation with David (agent sessions, reviews, discussion). There is no fixed conversation language: agents mirror whatever language David uses in each exchange. Everything else in the D-014/D-015 audience split is untouched — English for code/commits/PRs/Linear/dev docs, Spanish for the two product documents and UI strings.
**Alternatives:** keep Spanish as default (the original D-014 row) · hard-switch the default to English (rejected: the point is removing the fixed default, not replacing it).
**Why:** David's call (branch `doc/remove-spanish-language-as-default`, PR #25): the fixed default added friction without serving any reader — the audience principle of D-014 applied to conversation resolves to "whatever the human in the conversation is using".
**Trail:** PR #25 · AGENTS.md §Languages (table row) + §Maintainer · D-014, D-015.

## D-040 · 2026-07-06 · Versioning: semver-lite + build metadata, zero ceremony (LCHP-24)

**Decision:** the app's version is `v{package.json version}+{short commit SHA}` (SemVer build-metadata syntax), composed at build time via Vite `define` constants (`__APP_VERSION__`, `__APP_COMMIT__`). The SHA resolves `CF_PAGES_COMMIT_SHA` → `git rev-parse --short HEAD` → `'dev'`, so every Cloudflare deployment and local build self-identifies with no manual step. The human version bumps only at **milestone completions** (M2 → 0.2.0, …, 1.0.0 at the M7 pilot), carried by the milestone-closing PR. Display: appended to the sample-data ribbon while test mode lasts, and a muted line at the bottom of Perfil permanently — **a sanctioned divergence from the mockup** (which has no version line), same nature as D-020/D-026. `src/lib/version.ts` is the single source; LCHP-17's service worker reuses it for update detection.
**Alternatives:** git tags + GitHub Releases + changelog (ceremony without readers: with continuous deploy the SHA is the release) · bump-whenever-it-feels-right (numbers lose meaning; gets forgotten) · version in the header permanently (dev noise in the game's most valuable pixels).
**Why:** during the street pilot "which build is this phone running?" is the first triage question, and the answer must be readable by a neighbor from their own screen; the SHA maps 1:1 to the Cloudflare dashboard and `git log`.
**Trail:** LCHP-24 · vite.config.ts · src/lib/version.ts · src/components/ui/SampleDataBanner.tsx · src/pages/ProfilePage.tsx (+ tests) · D-020, D-026.
**First bump (2026-07-06):** M2 (Supabase foundation) completed with LCHP-12 → `0.1.0` → `0.2.0`, carried by LCHP-12's PR #28 per this policy.
**Second bump (2026-07-07):** M3 (Map) actually completed on 2026-07-06 with LCHP-13/LCHP-24, but its closing PR (#30) missed the bump — caught by David during the LCHP-15 session and carried late by a chore PR: `0.2.0` → `0.3.0`. Lesson: the milestone-closing PR checklist must include the bump.

## D-041 · 2026-07-06 · Quota trigger derives anonymity from auth.users, not the JWT (LCHP-12)

**Decision:** migration 0005 ships the per-user/day quota trigger (D-032) with one redesign vs the LCHP-3 spike prototype: anonymity comes from `auth.users.is_anonymous` for the row's `created_by`, not from the caller's JWT claim. Authorless rows (`created_by` null) are exempt. Day boundary is UTC midnight.
**Alternatives:** JWT claim (the spike's design — correct for direct PostgREST inserts, wrong under D-037 where inserts arrive via the Edge Function's service role, whose JWT carries no user identity) · passing the user's JWT through to the insert (fragile; couples the data layer to transport).
**Why:** the trigger must stay the source of truth for EVERY entry path; deriving from the authoritative users table makes it path-independent.
**Hardening (Codex adversarial review, HIGH):** count-then-insert races under READ COMMITTED — N parallel requests could all pass the count before any sibling commits. The trigger now takes a **transaction-scoped advisory lock keyed per user and UTC day** before counting, serializing same-user inserts while leaving different users uncontended. pgTAP asserts the lock is held during inserts (true multi-session racing is beyond its single connection — the canary proves the mechanism exists).
**Trail:** LCHP-12 · supabase/migrations/0005 · brief §30 · pgTAP quota tests · D-032, D-037.

## D-042 · 2026-07-06 · Edge Function data surface: explicit least-privilege grants for service_role (LCHP-12)

**Decision:** migration 0006 grants `service_role` exactly what the function touches — `SELECT` on `species` and `app_config`, and **column-scoped** privileges on `sightings`: INSERT only on the eight columns create-sighting writes, SELECT only on the five its queries read (Codex review: full INSERT would let a future route bug set `moderation_status`/`points_awarded` at creation; full SELECT would expose private coordinates the function never needs). pgTAP asserts the positive paths and the negatives: DELETE denied, `moderation_status` not insertable, `lat_private` not readable.
**Alternatives:** rely on implicit defaults (broken: the modern local stack creates public tables with NO DML for service_role — only REFERENCES/TRIGGER/TRUNCATE — while the hosted project, provisioned under classic defaults, still hands service_role implicit ALL; code that works on one silently fails on the other) · granting ALL to service_role (works, but resurrects the implicit-superuser pattern the 0004 hardening moved away from).
**Why:** discovered live when the function failed against the local stack with 42501 on `species` while the identical query succeeded hosted. Explicit grants make the environments identical, the function's blast radius reviewable in one file, and future routes' needs a conscious migration. **Round 2 correction:** GRANT is additive, so on hosted the legacy implicit ALL would have survived alongside the narrow grants — 0006 now REVOKES ALL from service_role on the seven public tables first, then grants the minimum, producing the same privilege shape in every environment; pgTAP asserts the shape via has_table_privilege (no table-level DML) plus the column-level negatives. The FINDINGS.md parity entry is resolved by this and LCHP-25 canceled as superseded.
**Trail:** LCHP-12 · supabase/migrations/0006 · pgTAP service_role tests · FINDINGS.md · D-037.

## D-043 · 2026-07-06 · Photo evidence requires a session; map reading does not (LCHP-12)

**Decision:** both Edge routes require a valid JWT — anonymous sessions included (D-032). Consequence: viewing photo evidence needs a session while reading the map stays sessionless via the public view.
**Alternatives:** apikey-only for `get-photo-url` (any scraper holding the public anon key could enumerate map ids and bulk-download every photo) · registered-only (kills evidence-before-verifying for anonymous participants, contradicting D-032's first-touch participation).
**Why:** the photos are the golden-rule asset; requiring a session makes bulk scraping cost at least GoTrue's anonymous-signup rate limit (30/h/IP) instead of being free, without adding any friction for real app users (the app holds a session for participation anyway).
**Trail:** LCHP-12 · supabase/functions/api/index.ts · brief §13 (contract) · D-032, D-037.

## D-044 · 2026-07-06 · Explainers live on GitHub, not Linear; Linear stays the plan/why

**Decision:** the division of labor between the two tools is fixed. **Linear** = the *what/why*: board state, ticket scope, acceptance criteria, session-plan comments, decisions, and any product-facing/planning visual. **GitHub** = the *how*: code, the PR body (Summary/Why/Test plan), and — for substantial or security-critical PRs — an optional Markdown "explainer" comment (mermaid + tables, viewable by anyone on the PR). A code walkthrough goes on the PR, never in Linear. Interactive HTML explainer artifacts are produced on request, not by default; when made, the PR comment links to them.
**Alternatives:** mirror every explainer into the Linear ticket too (rejected: duplicates the ticket's own plan/acceptance trail, adds no planning value, and Linear doesn't render mermaid — the diagrams would degrade to code blocks) · always attach an interactive artifact to every PR (rejected: noise on docs/chore PRs; reserve for PRs that warrant it) · keep explainers only as private claude.ai artifacts (rejected: not viewable by a reviewer who only sees the PR).
**Why:** an explainer answers "what did this change do and how does it work" — a reviewer's question, mapped to the diff — so it belongs where the code is. Keeping each tool to its lane (Linear plans, GitHub implements) matches the AGENTS.md "Resuming work" model (the board is the state truth; PRs explain themselves). Confirmed with David after the LCHP-11/LCHP-12 explainers.
**Trail:** AGENTS.md §Linear and GitHub · PR #26 (LCHP-11 explainer comment) · PR #28 (LCHP-12 explainer comment) · D-033.

## D-045 · 2026-07-06 · Map tint: «pergamino suave», picked from four visual-loop variants (LCHP-13)

**Decision:** the OSM raster is tinted with `grayscale(0.45) sepia(0.30) brightness(1.06)` as a CSS filter on the MapLibre canvas plus a cream multiply veil (opacity 0.22). The filter targets the canvas only, so marker sprites keep their true colors. Raster-paint properties stay untouched (provider plumbing only).
**Alternatives:** four candidates were screenshotted side by side over the same real La Latina frame and David picked V4: V1 raster-paint + color-blend veil (subtle; OSM greens survive) · V2 strong sepia (golden monochrome — most "chispera" but kills OSM's semantic colors) · V3 terracotta (reddish toward the accent; aggressive).
**Why:** kills the embedded-Google-Maps look while keeping maximum label legibility; a CSS filter reproduces exactly what the visual loop showed. Vector tiles with a real custom style remain the post-MVP endgame (§23).
**Trail:** LCHP-13 · src/styles/globals.css (.barrio-map) · src/components/map/BarrioMap.tsx · tileProvider.ts · visual-loop artifact (tint comparison).

## D-046 · 2026-07-06 · The map shows a generic approximate location — no author, no street (LCHP-13)

**Decision:** the detail sheet and the «Cerca de ti» rows show «Ubicación aproximada · La Latina · hace X» — no author alias and no street name. This is a sanctioned divergence from the mockup (which showed «@rosa_lat» and «Plaza de los Carros» from fake data).
**Alternatives:** show the author (impossible: `created_by` is on the public view's forbidden list — §12/D-037) · reverse-geocode a street label at read time (rejected for now: adds a Nominatim runtime dependency and could suggest more precision than the ~55 m public snap honestly has).
**Why:** the golden rule owns this surface; the pin already IS the location. The richer, accuracy-adaptive label («street if we trust the coordinate, neighbourhood if we don't» — David's design) arrives with LCHP-26, which stores a private reverse-geocoded label at capture and exposes an accuracy-bounded public one after its own adversarial review.
**Trail:** LCHP-13 · LCHP-26 (comment 2026-07-06) · brief §18 · D-037.

## D-047 · 2026-07-06 · Lazy anonymous session, minted by the first action that needs one (LCHP-13)

**Decision:** the app starts sessionless (map reads are public). The first action that requires a JWT — viewing photo evidence today, capture in LCHP-14 — calls `ensureSession()`, which reuses the existing session or signs in anonymously (D-032).
**Alternatives:** anonymous sign-in on app boot (burns GoTrue's 30/h/IP anonymous-signup budget on every visitor including pure readers, and creates permanent auth.users rows for people who never participate) · requiring registration before evidence (contradicts D-032's first-touch participation).
**Why:** sessions are created exactly when the product needs them; a map lurker costs nothing. The anonymous id is permanent and upgrades in place (LCHP-3), so nothing is lost by minting it mid-flow.
**Trail:** LCHP-13 · src/lib/session.ts · src/services/evidence.service.ts · D-032, D-043.

## D-048 · 2026-07-06 · The sample-data ribbon stays until the last fake service dies (amends LCHP-19's plan)

**Decision:** `USING_SAMPLE_DATA` is NOT flipped in LCHP-13, although the original LCHP-19 note said it would be. The map now reads real data, but capture, ranking and profile still serve prototype fixtures — «versión de prueba · datos de ejemplo» remains true for most screens. The ribbon (which also carries the version string, D-040) retires when the last fake service goes real (M6).
**Alternatives:** flip now because the map is real (would remove the warning while 3 of 5 screens still show fake data).
**Why:** the ribbon's promise is about the app, not one screen; keeping it honest beats keeping the original schedule.
**Trail:** LCHP-13 · src/lib/flags.ts · LCHP-19 · D-040.

## D-049 · 2026-07-06 · Dual-purpose database: the game feeds the association's internal touristification dataset

**Decision:** the Supabase database is not only the game's backend — A.V. La Chispera will use it as their internal dataset of touristification signals (short-term rentals, key boxes, auto check-ins…). Standing consequence for data design: when a choice trades off "the game doesn't show X" against "don't store X", lean toward **storing rich private data** (exact coordinates in `lat/lng_private`, measured GPS accuracy in `location_accuracy_m`, the future reverse-geocoded `approx_area` of LCHP-26) — always server-side, never exposed through the public views, with the golden rule untouched on every public surface.
**Alternatives:** store only what the game shows (simpler, but throws away the association's future dataset) · a separate database for the association (duplicates capture effort; the sightings ARE the dataset).
**Why:** David's call (2026-07-06): the neighbors' documentation effort should build the association's evidence base, not just game state. The privacy model already separates public from private surfaces, so richness and the golden rule don't conflict.
**Trail:** David (LCHP-13 session) · LCHP-26 · D-037, D-046 · memory of the capture schema (lat/lng_private, location_accuracy_m).

## D-050 · 2026-07-06 · Photo capture: in-app viewfinder primary, native input + gallery as fallback (LCHP-14)

**Decision:** the photo step offers both techniques the LCHP-5 spike verified: an in-app `getUserMedia` rear-camera viewfinder («Abrir visor» → «Disparar») as the primary UX, and the native system camera (`<input capture="environment">`) plus a gallery picker as the always-works fallback. Every source — viewfinder frame, system-camera shot, gallery file — goes through the same `processPhoto` pipeline before anything leaves the device.
**Alternatives:** native input only (simplest and instant, but loses the in-app framing experience the prototype promised) · viewfinder only (fragile: iOS viewfinder startup measured at 1.4–5.4 s in the spike, and any getUserMedia failure would dead-end the flow).
**Why:** David's call at kickoff («ambos»). The spike proved both paths strip GPS identically, so offering both costs only UI code and removes every dead end: a slow/failed viewfinder degrades to the system camera in one tap.
**Trail:** LCHP-14 · LCHP-5 device matrix · src/features/hunt/PhotoStep.tsx · D-051 (pipeline).

## D-051 · 2026-07-06 · Deterministic client-side EXIF stripping: canvas re-encode + JPEG segment walker (LCHP-14)

**Decision:** the golden-rule guarantee is enforced twice, both on the client: (1) decode → downscale to ≤1280 px → canvas JPEG re-encode (drops the original metadata wholesale; proven on Android/Chrome-iOS/Safari-iOS in LCHP-5), then (2) a byte-level JPEG walker (`stripJpegAppSegments`) removes every APP1–APP15 and COM segment the encoder re-added, keeping only APP0/JFIF. Quality steps down (0.8→0.5) until the stripped result fits the 512 KB server cap. Unit-tested against a hand-crafted GPS-bearing EXIF fixture.
**Alternatives:** trust the canvas re-encode alone (WebKit re-writes orientation + colour-profile EXIF on export — GPS-free today, but the guarantee would rest on undocumented per-engine encoder behavior) · server-side reprocessing (post-MVP per brief §17; the free tier's Edge Function budget is better spent elsewhere and the photo must ALREADY be clean in transit).
**Why:** the LCHP-5 Codex adversarial review recommended exactly this: make privacy deterministic, not an artifact of whichever encoder ships in next year's WebKit. Dropping re-added orientation tags is also correct, not just safe — orientation is already baked into the pixels, so a surviving tag could double-rotate.
**Hardening (Codex adversarial review of THIS branch, HIGH):** the client pipeline protects the honest neighbor, but the server is the real trust boundary — a modified client could POST metadata-bearing bytes straight to `/create-sighting`. The route now rejects (400 `invalid_image`) any JPEG carrying APP1–APP15/COM segments and any WebP carrying EXIF/XMP chunks, failing closed on malformed structures; a legitimate client never trips it because the pipeline output is exactly the allowed shape (SOI·APP0·frame·SOS). Deno tests cover the guard and an EXIF-bearing upload; verified live against the local stack (hostile curl → 400, real flow unaffected). The review's second HIGH (pending photos retrievable before moderation) was dismissed as a documented product decision: pending sightings are visible by design (LCHP-1 amendment) and community validation (§20, LCHP-15) requires seeing the evidence; access already needs a session (D-043) with 5-minute URLs, and automatic moderation is the phase-D plan (§25–26).
**Trail:** LCHP-14 · src/lib/photo.ts + photo.test.ts · supabase/functions/api/lib/validation.ts (imageCarriesMetadata) + create-sighting.ts · LCHP-5 review comment · brief §17.1.

## D-052 · 2026-07-06 · Location picking: fixed center pin, position = map center, GPS on tap (LCHP-14)

**Decision:** the location step is a MapLibre picker where the pin is fixed at the viewport center and the user drags the map underneath (Uber pattern); the submitted position is ALWAYS the map center, at full precision (D-049 — the server snaps the public grid). «Usar mi ubicación» fires `getCurrentPosition` on the user's tap — never on load — recentering the map on the fix (accuracy shown, sent as `accuracy`); any later manual drag reverts the position to source=manual with no accuracy claim. Denial/unavailability (the iOS `code=1` case from LCHP-5) shows «Actívala en Ajustes → Safari…» guidance and the manual pin keeps working — geolocation is never required. A client-side mirror of the server bbox blocks continuing with an out-of-bounds pin before a doomed submit.
**Alternatives:** tap-to-place pin (less precise with fingers on small screens) · draggable marker (fiddly on mobile; competes with map panning) · prompting for location on step load (lower grant rates; iOS may reject promptless calls — LCHP-5/LCHP-14 kickoff decision, with the onboarding primer split to LCHP-27).
**Why:** David's call at kickoff; one interaction (drag) serves both the no-GPS fallback and GPS refinement, and "position = map center" leaves no ambiguity about what gets submitted.
**Trail:** LCHP-14 · src/components/map/LocationPickerMap.tsx · src/features/hunt/LocationStep.tsx · src/lib/geo.ts · LCHP-5 Safari run · LCHP-27 · D-049.

## D-053 · 2026-07-06 · Equipment gate: permissions primed at capture entry, one gesture, nothing wasted (LCHP-28)

**Decision:** the capture flow is fronted by a gate («🎒 ¡Prepara tu equipo!») whenever a native permission prompt is actually coming (camera not `granted` per the Permissions API — reliable for camera, unlike geolocation). One tap fires both native prompts in a single gesture; the granted camera stream is handed live to the viewfinder (instant open) and the geolocation fix is cached to pre-center the location step's map. «Ahora no» always degrades to the system-camera/gallery path. Denial guidance is per-platform — the old copy sent iOS users to «Ajustes → Safari», which has no location entry (David hit it live); the real path is Ajustes → Privacidad y seguridad → Localización → Sitios web de Safari. Returning iOS users get a tip to make grants permanent (ᴀA → Ajustes del sitio web → Permitir), because iOS Safari does not persist camera grants across page loads (WebKit 215884) — which is also why the gate re-arms per session there: a native dialog never interrupts mid-action, on any platform.
**Alternatives:** prompts at first use inside each step (the LCHP-14 kickoff decision, hereby amended — David's device pass found the mid-action interruption rough) · prompts during onboarding (cold asks convert worse: ~12% without intent vs 30%+ contextual, and up to +41% with a rationale overlay — web.dev/CHI 2025 data; LCHP-27 stays as a context-only line) · a "first time only" localStorage gate (would lie on iOS, where the OS re-asks per session regardless).
**Why:** David's street feedback (2026-07-06) + research: the rationale-before-prompt pattern has the strongest measured effect on grant rates, and tying it to capture entry gives maximum context. Priming both permissions in one gesture, then handing the stream/fix to their steps, makes the whole flow feel like the permissions never happened.
**Trail:** LCHP-28 · src/features/hunt/EquipmentGate.tsx · src/lib/permissions.ts · PhotoStep/LocationStep handoffs · research sources in the LCHP-28 ticket · amends D-052's prompt timing · D-050, D-051 unchanged.

## D-054 · 2026-07-07 · Verification: anyone confirms, registration validates — provisional support + deferred credit (LCHP-15, amends D-038)

**Decision:** the `verifications` INSERT opens to anonymous sessions (migration 0007 drops D-038's `NOT is_anonymous` from the policy; target invariants and column grants unchanged). Whether a confirmation COUNTS is decided server-side: while `app_config.verification_requires_registration = 'true'` (default, fails closed on a missing key), an anonymous confirmation is stored as **provisional support** — `status` stays `pending`, it adds nothing to the threshold and mints no points. When its author registers (same `auth.users` row, LCHP-3), the `on_auth_user_registered` trigger **activates it retroactively**: it counts toward `validation_threshold` (possibly validating the sighting then) and collects its +5. Consolidation lives in `private.consolidate_sighting()`: sighting row lock (`FOR UPDATE`) + atomic `UPDATE … WHERE moderation_status = 'pending'` as THE concurrency boundary (the binding LCHP-11 contract — proven with a real parallel race at threshold 1: one 201, one 403, exactly one +10). On a successful transition, **every** counting confirming verifier earns +5 (David's call: not only the one who tipped the threshold — matches brief §15 and doesn't punish early verifiers), guarded per-row by `verifications.points_awarded`; the author's +10 is guarded by `sightings.points_awarded`; `profiles.total_points/weekly_points` caches update in the same transaction. Flipping the switch to `'false'` (an UPDATE, no deploy) makes anonymous confirmations count fully — the pilot escape valve — and an `app_config` trigger consolidates the provisional confirmations ALREADY stored at that moment (Codex round 2, HIGH: they would otherwise stay inert).
**Alternatives:** registered-only verification (D-038 as written — walls out the 100%-privacy neighbor; every step of the UX research pointed away from walls) · full anonymous verification (rejected: reopens the incognito self-validation HIGH from LCHP-11 — no studied platform lets an identity-free action flip rewarded state) · threshold variants (≥1 registered among N) — more complex, weaker than deferral.
**Why:** David re-opened D-038's premise during LCHP-15 kickoff wanting privacy-first neighbors to participate. Research across 7 platforms (iNaturalist, eBird, Zooniverse, OSM Notes, FixMyStreet, Waze, Wikipedia) found the two transferable patterns this design composes: OSM's provisional-signal ("should be independently verified") and e-commerce deferred credit (guest checkout → claim on signup). The sybil cost of map state and leaderboard points stays one email; the association keeps every contribution as data (D-049). Full exploration with mockups: the LCHP-15 artifact.
**Trail:** LCHP-15 (kickoff comment + artifact) · supabase/migrations/0007 · supabase/tests/verification_consolidation.test.sql · brief §12, §14, §15, §16, §20 · D-037, D-038, D-049 · LCHP-29/LCHP-30 (registration UI + invitations).

## D-055 · 2026-07-07 · Registration is invited after value exists, never walled (LCHP-15 session; scoped to LCHP-29/LCHP-30)

**Decision:** the app invites registration at three moments — after the first successful hunt (soft panel with endowed progress: «guarda tus puntos, por si cambias de móvil»), after confirming a sighting (the D-054 deferral makes this an invitation, not a wall: «apoyo guardado · regístrate para que cuente y cobrar tus +5»), and in Perfil when pending value exists — plus a permanent passive «Guarda tu cuenta» entry in Perfil. All prompts are dismissible, fire once per milestone (never per session), and never show for registered users. Copy uses gain+protection framing with a stated reason, never loss threats. The upgrade flow itself (LCHP-29) uses an **email OTP code**, not a clickable magic link: in an installed iOS PWA the link opens in Safari, which does not share storage with the PWA — the 6-digit code verified in-app via `verifyOtp()` is the only flow reliable across every target context. Custom SMTP before the pilot (built-in sender: ~2 emails/hour). Social login: only Google is worth considering, post-MVP, via `linkIdentity()` (beta manual-linking flag); Apple ($99/yr, iPhone-minority), Facebook (business verification + trust deficit) and X (unstable platform) are rejected.
**Alternatives:** registration at onboarding (worst by every source — Baymard: 26% abandonment from forced account creation) · only a passive Perfil entry (unreliable trigger; anonymous sessions die with cleared storage — neighbors would lose months of points) · timer-based re-prompting (nagging kills this audience's trust).
**Why:** measured evidence over intuition: Duolingo's A/B (~+20% DAU moving signup after value; 2 soft walls + 1 hard), NN/g's reciprocity principle for login walls, endowed progress (Nunes & Drèze 2006: 34% vs 19% with a stated reason). David chose all three moments; research trails in the LCHP-15/LCHP-29 ticket comments.
**Trail:** LCHP-15 artifact §05 · LCHP-29 (OTP flow, SMTP, provider research comment) · LCHP-30 (the three prompts) · D-054.
