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
