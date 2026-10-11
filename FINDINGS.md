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

## [LCHP-42] — Map: leftovers from the LCHP-35 review (cluster taps, fallback dots, crowded cells, blink cost)

**Problem:** the third and last review round of LCHP-35 approved with low-severity items left open on purpose. None affects privacy.

1. A tap on «Ir a mi posición» does not supersede a cluster that is still opening: the controller cannot tell a locate tap from a GPS update, so the cluster's late answer wins (a window of milliseconds).
2. After a refresh that changes who shares a grid cell, the picked pin is redrawn at its new slot but the camera does not follow (about 10 m).
3. If only some pin images fail to rasterise, the fallback dots are drawn under healthy pins too and show through a pending pin mid-blink; with a total failure the picked sighting is not marked and pending dots do not blink.
4. From the nineteenth sighting on one public coordinate, the third ring lands nearer a neighbouring cell's point than its own.
5. The blink's cost was never measured: while any pending pin exists the map repaints whole about twenty times a second, even idle.
6. The chip ring computes its phase once, so toggling reduced motion while the screen is open leaves it out of step.
7. One mutation still passes the suite (`intent++` put back into `userStep()`).
8. Rasterising the pin SVGs was only verified in Chromium.

**Context:** found by the cross-model review of LCHP-35 (three rounds, the budget set for it under D-064). The triage table is in that PR's description.
**Proposal:** measure item 5 on a real phone first — it is the only one that could matter to every user; fix 1, 2 and 7 together in the controller; 3, 4, 6 and 8 as they come up. Decide by 2026-10-23: schedule it or demote it to `post-mvp`.
**RESOLVED 2026-10-09 (LCHP-42, D-063 Addendum 5):** 1, 2, 3, 6 and 7 fixed. 5: measured without a GPU, and the blink now rests while no pending pin is drawn on screen; its cost with one in view, measured by David on two phones (a third and a fifth of the main thread), is LCHP-43. 4: left as it is, with the reason recorded. 8: Firefox converts the artwork; Safari on a real iPhone 12 draws the pins.

## [LCHP-44] — Map: MapLibre threw from `queryRenderedFeatures` under a burst of operations

**Problem:** MapLibre 5.24 threw once from `queryRenderedFeatures`: `Out of bounds. Index requested n=0 can't be >= this._numberToString.length 0`, in `loadMatchingFeature`. It came from a reviewer's own whole-viewport query, 2 s after a stress run of 200 controller operations fired 0–60 ms apart (refreshes, picks, zooms, turns of the map, heat mode, resizes) had ended. The app does not produce that kind of input. Not checked: whether the error persists once it has happened, and whether the controller's own queries can hit it. Neither is guarded: the look that decides which pending pins blink (`inSight` in `createBarrioMap.ts`) and the tap handler, which predates LCHP-43.

**Context:** found by the Opus seat in round 3 of the LCHP-43 review (PR #47), with its probe harness against the real controller on a stub map style. Outside that PR's scope.
**Proposal:** try to reproduce it against the real controller. If input the app can produce reaches it, make a throw from either query a missed look or a lost tap instead of an uncaught error, and report it upstream if it is MapLibre's; if not, close with the reason. Decide by 2026-10-25: schedule it or demote it to `post-mvp`.

## [LCHP-45] — Hosting: the site was unreachable from some Spanish networks on a Saturday night

**Problem:** on Saturday 2026-10-10, in the evening, production and every branch preview on `la-invasion-silenciosa.pages.dev` were unreachable from David's network and from the development machine; it had worked all morning and cleared from about 23:33 CEST. Connections to the two Cloudflare addresses the site resolved to there (`188.114.96.5`, `188.114.97.5`) hung until they timed out. The deployments were healthy: the same hostname through another Cloudflare address answered HTTP 200, and at 23:34 twelve outside probes (eight in Spain, four abroad) loaded it, several through those same two addresses. Other Cloudflare sites, the map tiles and the rest of the internet worked throughout; Cloudflare's status page listed nothing relevant. **The cause is not known.** It fits the court-ordered blocking of Cloudflare addresses by Spanish internet providers during LaLiga matches (these address ranges, match days, the late Saturday match ending around 23:00), but that is an inference from timing and symptom: the probes ran after it had started clearing and most were in data centres, not on consumer connections. Not a quota or account problem, which returns an error page and not a hang.

**Context:** David could not open the LCHP-43 preview to check it before merging. Outside any ticket's scope.
**Proposal:** the next time it happens, run the outside probes while it is failing, on consumer networks, and note the provider. If it is the match-day block, neighbours on the affected providers cannot open the app on weekend afternoons and evenings; the ways out (a custom domain, another host for the static site, or accepting it) touch the locked stack and possibly the free tier, so they are David's decision. Decide by 2026-10-25: schedule it or demote it to `post-mvp`.
