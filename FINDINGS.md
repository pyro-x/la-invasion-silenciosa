# Findings

Lightweight log of tech debt, future improvements and things we noticed
while working on something else.

**Rules:**

1. Every entry MUST have its Linear ticket (team `LCHP`, label `tech-debt`)
   so it doesn't rot here.
2. A `tech-debt` ticket cannot sit for more than **2 weeks** without a
   decision: schedule it into a milestone or explicitly demote it to
   `post-mvp`.
3. Entry format: `## [LCHP-N] — Title`, with **Problem**, **Context**
   (where/how it was discovered) and **Proposal**.

---

## [LCHP-21] — captura_02_briefing.png is a mislabeled map frame

**Problem:** the onboarding/briefing screen has no valid reference capture: `captura_02_briefing.png` is a near-duplicate of `captura_03` (the map).
**Context:** found by the LCHP-7 visual loop; the screen was verified against the prototype JSX source instead.
**Proposal:** re-capture from the deployed mockup with `?onboarding=1` and replace the file (small docs PR).

## 2026-07-06 · Hosted service_role still holds implicit ALL on public tables (parity gap with local)

**Found during:** LCHP-12 (Edge Function), while diagnosing why the function failed locally but its queries worked hosted.
**What:** the hosted project (provisioned under classic Supabase defaults) grants `service_role` implicit ALL on `public` tables; the modern local stack grants it no DML at all. Migration 0006 adds the explicit minimal grants the Edge Function needs (making code behave identically), but hosted `service_role` retains extra privileges (UPDATE/DELETE on everything, etc.) that local doesn't have and nothing uses.
**Risk:** low today (the service key lives only in Edge Function secrets), but it's invisible attack surface and an environment divergence that pgTAP cannot see (tests run locally).
**Candidate fix:** a migration revoking service_role's leftover implicit privileges on public tables down to the 0006 baseline — needs care (verify nothing in Supabase's own tooling depends on them) → own tech-debt ticket.
**RESOLVED same day (Codex adversarial review round 2, in migration 0006 itself):** GRANT being additive meant 0006's narrow grants constrained nothing on hosted; 0006 was revised to REVOKE ALL from service_role on the seven public tables before granting the least-privilege surface, closing the gap in the same migration. Ticket LCHP-25 (opened for a follow-up) canceled as superseded.

## [LCHP-38] — Map controller: leftovers from the LCHP-34 review (zoom buttons, tests)

**Problem:** the last review round of the map screen approved with low-severity items left unfixed on purpose. All are in `src/components/map/createBarrioMap.ts` and its test, and all concern the zoom +/− buttons (mouse devices only); none affects a phone or privacy.

1. A window that grows during the 250 ms of a zoom-out step ending at the pan limit leaves that step unstored: the target is computed once, `map.resize()` re-constrains without stopping the move, and the step is taken for a cut one. The previous view stays; nothing wrong is stored.
2. The test stub's `applyConstrain` does not clamp to the zoom limits as MapLibre's does, so the app's own clamp in `zoomStep` is redundant and its min half is unpinned.
3. No test for a carried follow stopped short by a gesture and then a user drag (the code is correct; one mutant survives).
4. `map.transform.applyConstrain` is typed and documented but sits on MapLibre's transform interface: re-check on an upgrade (a rename fails the typecheck, it cannot misbehave silently).
5. `ease()`'s `carry` parameter is dead: `carriedZoom = to.zoom ?? null` is equivalent for every caller.
6. Two quick presses of a zoom button add less than two full steps: the second starts from the zoom the first had reached.
7. Accepted, not to be fixed: a gesture that takes over a step and then moves nothing leaves the step's claim, so a later window resize stores the zoom on screen (reason in D-061 Addendum 5).

**Context:** found by the cross-model review of LCHP-34 over rounds 8–13 (PRs #41 and #42). David capped the loop at two more rounds after round 11; round 13 approved with these as follow-up. The full triage table is in PR #42's description.
**Proposal:** one small PR for items 1–6 — recompute the step's target at `moveend` (1), make the stub clamp and drop `within` (2), add the test (3), drop `carry` (5), decide on accumulating the target (6); item 4 is a note for the next MapLibre bump. Decide by 2026-10-23: schedule it or demote it to `post-mvp`.

