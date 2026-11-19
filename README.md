# MyVibe

A privacy-first browser extension for constructive online conversations.

## Guiding principle
**Criticism and disagreement never lower the score merely because they are critical or negative.** Criticize ideas, policies, behavior or arguments freely. MyVibe is **neutral by default**, distinguishes constructive disagreement from dismissive phrasing, and focuses on **personal attacks**. Name-calling, insults about appearance, and identity-targeted hostility (race, sex, gender, sexuality, religion, disability, etc.) receive more severe penalties. Even when criticism is harsh, criticism itself is not a personal attack. Scoring may still be inaccurate, particularly with sarcasm and quotations.

## Current prototype (v0.5)
- Chrome/Edge Manifest V3 extension for X, Reddit, Threads and Bluesky.
- Inline tone coach for textarea and contenteditable text boxes.
- Local **rule-based** detection of a small set of insults, identity-directed hostility, dismissive phrasing and potentially passive-aggressive expressions; **AI is not connected yet**. Passive-aggressive detection is particularly context-dependent and advisory only.
- Optional suggested rewrites for a few patterns, preserving author choice.
- Draft score from 0–100 with a **neutral baseline of 50**. Meaningful encouragement, congratulations, gratitude, empathy, kindness and specific compliments increase the score; personal attacks reduce it. Unambiguous dismissive phrasing can carry a small penalty, and ambiguous phrases have no numerical penalty. All weights remain provisional. **Scores are heuristic, not assessments of character.**
- Explicitly opt-in to storing a sample via **Add to my vibe history**.
- Private popup demo starts at 50, then uses an 8% rolling update for each manually saved draft under the v0.5 scoring schema. Older scores from incompatible versions are excluded. This is not an account reputation or verified-post score. It is not yet a comprehensive or representative account score.
- No post text sent to servers or stored. Only score, categories, hostname and timestamp saved locally.
- Public sharing unavailable until proper accounts, consent and protections are built.

## Install locally
1. Clone this repository.
2. Go to `chrome://extensions` (or `edge://extensions`).
3. Enable Developer mode.
4. Select **Load unpacked**, then choose the `extension` directory.
5. Visit one of the supported sites and type into a post/reply composer.
6. Use the tone coach, and explicitly save samples if you want a private score.

## Tests
Requires Node.js 20+. Run `npm test`. CI uses GitHub Actions.

## Planned next
1. Context-aware AI moderation that distinguishes personal abuse from critical arguments, quotation and counterspeech.
2. Meaning-preserving AI suggestions, without automatically changing what someone writes.
3. Reliable post-submission tracking, per-site controls, privacy choices and score methodology.
4. Calibrated, explainable scores, anti-gaming and error review.
5. Consent-based public profiles, data export and deletion.

This first build is a functional prototype, not a production-ready AI moderation system.

## Interpretation policy

- Never claim to know a writer's intention. Say **'Other readers might interpret this as…'** and show uncertainty.
- A disagreement such as 'I think that is wrong because…' should remain score-neutral.
- 'That argument is ridiculous' is not a personal attack but may receive a **small constructiveness deduction** for dismissiveness.
- 'If you say so' is neutral: it can signal concession, not necessarily dismissal, so it has no detection or penalty. Ambiguous phrases such as 'Must be nice', 'Good for you', and 'No offense, but' may receive **optional interpretation notes** but **never a numerical deduction by themselves**.
- We need an opt-out and real context-sensitive AI review before making any of these evaluations public or using them as definitive judgments about people.

## Neutral speech and belief protections

- No positivity requirement or reward for forced cheerfulness. Ordinary messages remain neutral by default.
- Religious belief, worship, discussing and criticizing religious doctrines, explaining why one believes or disbelieves, and inviting others to consider a religion are **not negative**.
- Constructive opposition to any religion, ideology, policy, institution or idea is allowed. Criticism becomes a concern when it attacks or demeans *people* because of their identity.
- Potential passive aggression is often context dependent. Advisory notes communicate alternative interpretations, not intent or guilt, and weak evidence never lowers a score.
- The mission is fewer hostile personal attacks and more meaningful discussion, not encouraging agreement or enforcing pleasantness.

## Balanced scoring philosophy (v0.4)

- The product's purpose is **less hostility and more constructive interaction**, not compulsory positivity.
- A neutral, respectful post is **50**. Ordinary criticism, religious discussion, and legitimate disagreement are not penalized.
- Explicit encouragement, congratulations, thanks, empathy, kindness or sincere compliments can raise the score above 50.
- Emoji never earns positive points. Identity-related symbols or emoji can trigger **context-only, zero-penalty interpretation advice** when paired with ambiguous wording; food emoji and other ordinary preferences remain neutral.
- Personal attacks, identity-directed hate and insults decrease the score; positive words cannot cancel out an explicit attack.
- Scores are experimental, context-insensitive message heuristics; they do **not** demonstrate someone's character or intention.
- Longer-term good-standing bonuses should only be considered after reliable verified-post attribution, daily caps and anti-spam measures exist. Neutral messages should not be gamed through repeated manual draft saving.
- A user's historical score should eventually include confidence/sample size and an understandable time window, with enough smoothing to avoid single-post swings. Public scores remain disabled pending consent and bias review.

### Example inspiration

The tone target includes encouragement, celebrating others and promoting growth, as seen in some publicly accessible posts by @tyromper. We have not analyzed that account's full timeline and have not assigned it a real score. Criticism and religion remain protected neutral topics; individual attacks still count against the score, regardless of overall positive messaging.

## Severity & contextual emoji (v0.5)

Individual message scores are **illustrative heuristics**, not an AI determination of intent:

| Example | Prototype score | Rationale |
| --- | ---: | --- |
| `Your post is dumb` | 43 | Dismisses a post, not the person |
| `Your religion is dumb` | 43 | Dismisses an idea/doctrine, not a religious person |
| `You are dumb` | 22 | Insults the person |
| `You're a fucking idiot` | 2 | Intensified personal insult |
| `I hate Jewish people` | 0 | Explicitly attacks people based on religion/identity |
| `I don't like ✡️` | 50 | Ambiguous: show non-punitive interpretation guidance |
| `I don't like 👨‍❤️‍👨` | 50 | Ambiguous: show non-punitive interpretation guidance |
| `I don't like 🍔` | 50 | Neutral food preference |

Religious beliefs, criticism of religions, theological disagreement, and inviting someone to a religion remain permitted neutral expression. Emoji representing identities or religions are **not proof** of animus; context can change interpretation. The user should be offered helpful phrasing, never told what they intended.

### Gradual history updates (private simulation)

A hypothetical rolling score of 80 followed by one recorded message with score `m` is updated using `new = 80 + 0.08 × (m - 80)`. Thus 43 → 77.04, 22 → 75.36, and 2 → 73.76. This prototype smoothing keeps single posts proportionate, but is not yet a defensible public reputation metric. Real public scores will require verified publication events, a time window, bot/spam safeguards, identity and context safeguards, appeals, and extensive calibration.

### Known issues

Rule-based language checks miss most nuance, other languages, quotations and complex emoji references. The extension stores only samples explicitly saved by the user, so its **score is a manipulable demo**, not a trustworthy assessment of anybody's posting history. Do not publish or compare these scores as if they were verified. A context-aware AI detector is future work.
