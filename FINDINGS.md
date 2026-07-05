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
