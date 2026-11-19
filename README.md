# MyVibe

A privacy-first browser extension for constructive online conversations.

## Guiding principle
**Criticism and disagreement never lower the score merely because they are critical or negative.** Criticize ideas, policies, behavior or arguments freely. MyVibe focuses on name-calling, personal attacks, appearance-based insults and identity-targeted hostility (race, sex, gender, sexuality, religion, disability, etc.). Scoring may still be inaccurate, particularly with sarcasm and quotations.

## Current prototype (v0.1)
- Chrome/Edge Manifest V3 extension for X, Reddit, Threads and Bluesky.
- Inline tone coach for textarea and contenteditable text boxes.
- Local **rule-based** detection of a small set of insults and identity-directed hostility; **AI is not connected yet**.
- Optional suggested rewrites for a few patterns, preserving author choice.
- Draft score from 0–100. **Scores are heuristic, not assessments of character.**
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
