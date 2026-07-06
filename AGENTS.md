# AGENTS.md — for AI agents and humans joining the project

Read this first. It points to every source of truth and explains how work
happens here.

## What this project is

**La Invasión Silenciosa** is a citizen-science game by **A.V. La
Chispera** (La Latina, Madrid): a mobile-first web app (PWA) where
neighbors document visible signs of touristification ("creatures") with a
photo and an approximate location, feeding a collective map with
community validation.

**Product invariant — the golden rule (NON-NEGOTIABLE):** we document
**creatures, never people**. No photos with people, private data (names,
doorbells, mailboxes) or license plates. Any feature touching photos or
location must preserve this rule. Details in
`docs/product/reglas-y-especificacion.md` §3.1.

## Sources of truth

| Looking for… | Where |
|---|---|
| Game rules, points, validation cycle, screens | `docs/product/reglas-y-especificacion.md` *(Spanish — see Languages)* |
| Architecture, stack, data model, security, roadmap | `docs/architecture/brief-tecnico.md` *(Spanish — see Languages)* |
| Visual prototype (source of truth for UI and flow) | `docs/prototype/` (JSX sources in `fuentes/`, screenshots in `prototipo_en_imagenes/`) |
| Roadmap and open work | [Linear · La Invasión Silenciosa — MVP](https://linear.app/ixine/project/la-invasion-silenciosa-mvp-5c9e727b8074) |
| Decision log (ADR-lite) | [`docs/DECISIONS.md`](./docs/DECISIONS.md) |
| Recorded tech debt | `FINDINGS.md` |
| Why each change was made | `git log --no-merges` (commit bodies explain decisions) |

**There is no separate specs folder (a conscious decision, D-003):** the
two documents under `docs/` are the living specs. The next section
explains how they are kept alive.

## The sync rule (the law of this repo)

> **If a PR changes behavior, it updates the corresponding document in
> the SAME PR.** Divergence between docs and code is a defect.

- Documents are prescriptive: the implementation conforms to them, not
  the other way around. If reality forces a doc change, change it in the
  same PR explaining why.
- The technical brief marks sections as **`Decidido`** (don't re-litigate
  without talking to David) or **`Explorando`** (open — choose and
  document).
- **Every non-obvious decision made during implementation** (choosing
  between alternatives, deviating from a template, resolving a ticket
  ambiguity) is recorded in [`docs/DECISIONS.md`](./docs/DECISIONS.md)
  **in the same PR**, with its ticket, commit and discarded alternatives.

## Linear and GitHub — how we work

- **Linear project:** [La Invasión Silenciosa — MVP](https://linear.app/ixine/project/la-invasion-silenciosa-mvp-5c9e727b8074) · team **`av-la-chispera`** (prefix **`LCHP`**). Milestones M0–M7. Tickets, milestones and new comments are written in English (D-015).
- **The ticket is a self-contained brief**: context, scope, sources of
  truth, unknowns and acceptance checklist. Implement by reading the
  ticket + the docs it links. If a ticket contradicts a doc → ask.
- **1 ticket = 1 branch = 1 PR.**
  - Branch: `feature/LCHP-N-short-slug` (e.g. `feature/LCHP-6-app-shell`).
  - Commits: `LCHP-N imperative lowercase description`, in English, with
    a verbose body explaining decisions.
  - PR: title `LCHP-N: Title`, body in English with **Summary / Why /
    Test plan**, and `Closes LCHP-N` so the Linear↔GitHub integration
    closes the ticket on merge.
- **Nothing merges without green CI** (typecheck, lint, format, tests,
  gitleaks) — enforced by branch protection on `main`.
- **Cross-model adversarial review (D-033)**: before opening a PR, run
  `/codex:adversarial-review --base origin/main` on the branch (Codex/GPT
  challenges the approach, not just the diff). **Mandatory** for the
  security-critical zone (see below) and for substantive feature PRs;
  skippable for trivial docs/chore changes. Triage every finding in the
  PR body: fixed, ticketed (`tech-debt`), or explicitly dismissed with a
  reason. Findings that change a design decision also land in
  [`docs/DECISIONS.md`](./docs/DECISIONS.md).
- Findings outside the current ticket's scope go to `FINDINGS.md` and get
  THEIR OWN ticket with the `tech-debt` label (max 2 weeks without a
  decision: schedule it or demote it to `post-mvp`).
- Spikes (`spike` label) deliver knowledge documented in the brief, not
  product.

### Never do

- ❌ AI attribution in commits or PRs (`Co-Authored-By: Claude`, etc.).
- ❌ `git add -A` / `git add .` — always stage specific files by name.
- ❌ `git commit --amend` unless David explicitly asks.
- ❌ Committing `.env`, service-role keys, or any secret. The Supabase
  `anon key` is public by design; EVERYTHING else is not.
- ❌ Touching the Supabase schema by hand in the dashboard: only
  versioned migrations under `supabase/migrations/` — forward-only,
  append-only. Full workflow reference: [`docs/SUPABASE.md`](./docs/SUPABASE.md).

## Languages (D-014, D-015)

| Scope | Language |
|---|---|
| Code: identifiers, types, tables, columns, comments | **English** (`Sighting`, `point_events`, `moderation_status`…) |
| Commits, PRs, README, this file, DECISIONS.md, FINDINGS.md, CI | **English** |
| Linear: tickets, milestones, new comments | **English** — same audience as the repo |
| Product documents (`reglas-y-especificacion.md`, `brief-tecnico.md`) | **Spanish** — they belong to the neighborhood association |
| UI strings visible to users | **Spanish** (quote them verbatim in Spanish inside tickets/PRs) |
| Conversation with David | Spanish |

## Stack — locked, do not re-litigate

| Topic | Decision |
|---|---|
| Frontend | React 19 + TypeScript (strict, no `any`) + Vite |
| Styling | Tailwind CSS v4 (CSS-first) + shadcn/ui + lucide-react |
| Remote data | TanStack Query; Zustand only if global state is needed |
| Map | MapLibre GL JS + OSM raster tiles (`tileProvider.ts` abstraction) |
| Backend | Supabase Free: Postgres + RLS + private Storage + **a single** router Edge Function |
| Hosting | Cloudflare Pages |
| Distribution | PWA (QR, no stores); Capacitor post-MVP only |
| Package manager | pnpm |
| Rejected for MVP | Next.js, React Native, Redux, self-managed Node backend, realtime, push, self-hosting |

Rationale for each choice: technical brief §7–§8. If you are tempted to
change anything in this table, read the corresponding brief section first.

## The spec is the ceiling, not the floor (MVP scope)

The technical brief covers entire post-MVP phases (automatic moderation,
blur, OCR, Turnstile, vector tiles, association mode). **Do not build
them ahead of time.** Rule of thumb:

- If a problem would be caught by a user screaming one minute after it
  happens → it belongs to the MVP.
- If it only manifests under massive abuse, months of data or exotic
  recovery scenarios → post-MVP; at most leave the slot in the schema or
  a `// TODO(post-mvp):` comment pointing to the brief section.
- The data schema IS created in full (`rejected`/`removed` states,
  `reports`…): it is the cheap escape valve. What is not built is the UI
  or the logic that uses them.

## Things that must make you stop and ask

- Any change to **RLS policies, Storage policies or the Edge Function
  auth** → this is the security-critical zone; it requires the
  cross-model adversarial review (`/codex:adversarial-review`) on the PR
  before merge, with every finding triaged.
- Anything affecting the **privacy golden rule** (photos, EXIF, location
  precision, which columns a public view exposes).
- Adding a dependency that competes with the locked stack.
- A ticket contradicting a doc, or a doc contradicting another.
- Any action that moves the project closer to leaving the free tier.

## Resuming work (for a fresh session/agent)

The live state of the project is NOT in a status file (status files rot);
it lives in two always-current places:

1. **Linear** — the board is the truth. Anything `In Progress` is where
   work stopped; the next `Backlog` ticket of the lowest open milestone is
   what's next. Ticket comments carry each work session's trail
   (plans, visual-loop rounds, spike conclusions, review triages).
2. **Open PRs** — `gh pr list`. An open PR is work awaiting review/merge;
   its body explains itself.

Resume procedure:

1. Read this file fully, then `docs/DECISIONS.md` (at least the last ~10
   entries) — decisions are binding.
2. `gh pr list` — deal with anything open before starting new work.
3. Linear: check `In Progress` first, then the top of the current
   milestone's backlog. The ticket is a self-contained brief; execute it
   per the conventions above (visual loop for UI, adversarial review per
   D-033, doc sync rule, decision log).
4. For Supabase work, read `docs/SUPABASE.md` first.

Environment quirks worth knowing:

- If the Linear MCP drops mid-session ("token expired" / tools vanish
  from `/mcp`), run `/reload-plugins` — it relaunches plugin MCP servers
  hot, no restart needed.
- The Supabase CLI needs `supabase login` once per machine; `db push`
  works without the database password (temporary role via Management
  API). Only one local stack runs at a time (fixed ports) — `supabase
  stop` other projects' stacks first.

## Maintainer

David Monterroso ([@pyro-x](https://github.com/pyro-x)) — conversation in
Spanish. A project of A.V. La Chispera.
