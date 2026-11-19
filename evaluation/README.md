# MyVibe scoring evaluation — curated regression suite

## Purpose
The `evaluation/curated-tone-cases.json` fixture and `scripts/evaluate-tone.js` turn our scoring principles into executable test cases. These tests guard against damaging regressions: normal criticism, disagreement, discussion of religion, political views and *clearly attributed quotations* must not be treated as the writer's personal attacks. Direct insults, identity-directed hostility and demonstrable kindness should be distinguished.

Run `npm run evaluate` (also runs automatically in GitHub Actions). The current set contains **70 curated examples** in four categories: neutral, negative, positive and ambiguous/advisory. The gate fails if any curated neutral/advisory example scores below or above 50, or if any curated negative/positive example lands on the wrong side of 50. The unit tests also check that abusive wording **outside** a quoted example still counts.

## Critical limitations

- This is a **hand-curated regression test**, not an independent benchmark, demographic fairness audit, real-world accuracy metric, or evidence of deployment readiness. A 100% pass rate means only these particular examples passed.
- Quote handling is intentionally narrow: a few reporting phrases followed by short quoted content. Arbitrary quotations, embedded screenshots, posts, replies, coded language, sarcasm and other languages need fuller contextual analysis.
- We do not score people, verify intent or assert that the heuristic is unbiased. Scores remain private practice estimates.
- The AI-assisted policy is tested separately; this fixture currently validates **only the offline heuristic scoring implementation**.

## Before any public scoring

1. Obtain consented, representative, independently annotated posts across platforms and languages, with privacy protections.
2. Add carefully matched counterfactual examples: quotations of hate speech, counterspeech, reclamation, identity-directed hostility, political/religious debate, ironic praise and sarcasm.
3. Measure false-positive and false-negative rates by category and subgroup, not just overall accuracy. Include reviewer disagreement, uncertainty and appeals.
4. Run adversarial tests, evaluate meaning-preserving rewrites, calibrate time-window score stability and validate source coverage.
5. Publish scoring methodology, a transparent contestation process, and coverage indicators before activating optional public badges.

The curated fixture is a **release regression gate only** and should not be advertised as a measure of fairness, generalization or human accuracy.
