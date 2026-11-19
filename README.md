# MyVibe

A privacy-first browser extension for constructive online conversations.

## Guiding principle
**Criticism and disagreement never lower the score merely because they are critical or negative.** Criticize ideas, policies, behavior or arguments freely. MyVibe distinguishes respectful disagreement from **dismissive phrasing** and from **personal attacks**. Name-calling, insults about appearance, and identity-targeted hostility (race, sex, gender, sexuality, religion, disability, etc.) receive more severe penalties. Even when criticism is harsh, criticism itself is not a personal attack. Scoring may still be inaccurate, particularly with sarcasm and quotations.

## Current prototype (v0.2)
- Chrome/Edge Manifest V3 extension for X, Reddit, Threads and Bluesky.
- Inline tone coach for textarea and contenteditable text boxes.
- Local **rule-based** detection of a small set of insults, identity-directed hostility, dismissive phrasing and potentially passive-aggressive expressions; **AI is not connected yet**. Passive-aggressive detection is particularly context-dependent and advisory only.
- Optional suggested rewrites for a few patterns, preserving author choice.
- Draft score from 0–100, calculated as **75% respectfulness and 25% constructiveness**. These are provisional weights requiring user research and calibration; subtle phrasing receives small penalties, while personal abuse receives larger ones. **Scores are heuristic, not assessments of character.**
- Explicitly opt-in to storing a sample via **Add to my vibe history**.
- Private popup score is the average of saved samples; not yet a comprehensive or representative account score.
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
- Passive-aggressive cues like 'If you say so' and 'Must be nice' can be sincere or sarcastic; only gentle, low-confidence suggestions are appropriate.
- We need an opt-out and real context-sensitive AI review before making any of these evaluations public or using them as definitive judgments about people.
