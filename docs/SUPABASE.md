# Supabase — how this project uses it

A reference for developers who know Postgres/SQL but not Supabase. What
the moving pieces are, how they fit, and the rules this repo follows.

## What Supabase actually is

A managed Postgres with batteries: on top of a vanilla Postgres 17
database, Supabase runs a set of services that expose it safely to a
browser app without a custom backend:

| Service | What it does | Where you've seen it |
|---|---|---|
| **PostgREST** | Auto-generates a REST API from the schema (`/rest/v1/<table>`) | The app's future data reads |
| **GoTrue (Auth)** | Users, sessions, JWTs, anonymous sign-in, magic links | Spike LCHP-3 |
| **Storage** | S3-like file buckets with SQL-defined access policies | Photos (LCHP-11/12) |
| **Edge Functions** | Deno functions for server-side logic | Our single API router (LCHP-12) |
| **Studio** | Web admin UI (tables, SQL editor, policies) | http://127.0.0.1:54323 locally |
| **Mailpit** (local only) | Catches outgoing email so magic links are testable | Spike LCHP-3's upgrade proof |

The key mental model: **the browser talks to Postgres almost directly**
(via PostgREST) using a public `anon` key. There is no application server
guarding queries. What stands between an anonymous visitor and your data
is **Row Level Security** — Postgres-native `CREATE POLICY` rules. That
is why RLS is enabled on every table from birth (deny-all until LCHP-11
adds the real policies) and why policy changes are our security-critical
zone.

## The three copies of the database

1. **The repo** (`supabase/`) — the *source of truth*. Not a database:
   the recipe for one.
2. **The local stack** — a disposable Postgres + all services, running in
   ~10 Docker containers on your machine. Created from the repo's recipe.
3. **The hosted project** (`mvypezppbjxdojknovvd`, eu-central-1) — the
   real one users will hit. Also built from the same recipe.

Local and hosted are both *derived*; only the repo is authoritative. If
you ever wonder "what does the schema look like?", read
`supabase/migrations/`, not a live database.

## Migrations: the only way schema changes happen

```
supabase/migrations/
  0001_initial_schema.sql          ← tables, triggers, RLS enablement
  0002_seed_reference_data.sql     ← species + app_config (idempotent)
  0003_sighting_data_invariants.sql← CHECKs added after the Codex review
```

Rules (the same ones AGENTS.md states, with the why):

- **Forward-only, append-only.** Once a migration has been applied
  anywhere (hosted or a teammate's local), it is history — never edit or
  delete it. To change something, write a NEW migration that alters it.
  Why: both databases track which files they've applied in
  `supabase_migrations.schema_migrations` (by name/hash). Editing an
  applied file makes the ledger lie, and the copies silently diverge.
- **Never touch the schema by hand** in Studio or the dashboard SQL
  editor. A manual change exists only in that one database — the repo no
  longer describes reality, and the next `db reset` or fresh clone
  produces something different. (Studio is great for *reading* and for
  prototyping a query; the moment it's schema, it goes in a migration.)
- **The brief's §14 mirrors the real schema** (sync rule): schema PRs
  update the brief in the same PR.

## The command cheat-sheet

| Command | Acts on | What it does |
|---|---|---|
| `supabase start` | local | Boot the Docker stack (first run downloads ~2 GB of images; later runs are instant). Applies all migrations to a fresh DB. |
| `supabase stop` | local | Shut the stack down (data persists in a Docker volume). |
| `supabase db reset` | local | Drop and recreate the local DB from zero: all migrations in order + `supabase/seed.sql`. Your "does the recipe still work?" button. |
| `supabase db push` | **hosted** | Apply migrations the hosted project hasn't seen yet (consults its ledger; only pending files run). |
| `supabase migration list` | both | Show the ledger: which migrations each side has. |
| `supabase db diff` | local | Generate a migration file from changes you prototyped locally (use sparingly; hand-written SQL preferred here). |
| `pnpm gen:types` | hosted | Regenerate `src/types/database.ts` from the live schema — TypeScript's view of Postgres. Run after every schema change. |
| `supabase login` / `link` | — | One-time: authenticate the CLI / bind this repo to the hosted project ref. |

Notes:
- `db push` works **without the database password**: the modern CLI
  provisions a temporary login role through the Management API using
  your `supabase login` token.
- Only one local stack can run at a time (fixed ports 54321-54324). If
  another project's stack is up, `supabase stop` it first — running
  `start` from the wrong directory boots that *other* project's (possibly
  empty) recipe, which looks like "my tables disappeared".

## Seeds: two kinds, deliberately

- **Reference data the product needs everywhere** (the 4 species,
  `app_config.validation_threshold`) lives in a **migration** (0002,
  idempotent `ON CONFLICT` upserts) — so hosted gets it too.
- **`supabase/seed.sql`** is local-only convenience (runs on `db reset`,
  never on hosted). We currently keep test/dev data out of it; it may
  gain fake sightings for local development later.

## Local vs hosted: when to use which

- **Local** (`supabase start`): developing migrations, testing policies
  and triggers destructively, full-flow auth tests (Mailpit catches the
  magic-link emails). Free, disposable, yours.
- **Hosted**: the pilot's real database. Free tier — with the quirks the
  LCHP-3 spike proved first-hand: **it pauses after ~1 week without
  traffic** (restore takes ~3-5 min via dashboard/API; data kept 90 days
  paused), so the pilot needs a weekly keep-alive. Anonymous sign-ins are
  already enabled there.

## Keys, in one line each

- **`anon` key** — public by design; ships in the frontend. Grants only
  what RLS policies allow (today: nothing).
- **`service_role` key** — bypasses RLS entirely. Server-side only (Edge
  Function secrets). Must NEVER appear in the repo or the frontend;
  gitleaks guards the repo, discipline guards the rest.
- **Access token** (`supabase login`) — your personal CLI/management
  credential, stored in `~/.supabase/`.

## Where the pieces land next

- **LCHP-11** — the real RLS policies + private Storage bucket + policy
  tests in CI (adversarial review mandatory).
- **LCHP-12** — the single Edge Function router (`create-sighting`,
  `get-photo-url`), reading `app_config.validation_threshold` instead of
  hardcoding rules.
- **M3+** — the app's fake services swap to PostgREST reads; components
  don't change (D-007).
