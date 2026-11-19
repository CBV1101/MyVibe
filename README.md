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

## Approved MyVibes visual design

The private extension popup includes a continuous, gapless semicircle meter (deep red → orange → yellow at 50 → light green → saturated green), a needle pointing to the numerical score, and a compact inline-style MyVibes badge with number and micro-gradient. These are generated using a reusable dependency-free SVG/DOM component in `extension/gauge.js`, not a static picture. Every color presentation is paired with the numeric score and an accessible label.

**Privacy boundary:** The badge is a preview in the account owner's extension only. Do **not** inject scores beside other people's usernames yet: we do not have verified account attribution, public-score consent, or a remotely retrievable score service. The future rollout must respect the profile owner's sharing preference, support unknown scores rather than inventing them, and avoid displaying self-saved draft scores as public reputation.

## Archive Insights prototype (local-only Pro feature preview)

The extension popup contains **Explore archive insights (Pro preview)**, opening `extension/insights.html`. Import your own CSV (`text` column and optional `date`) or JSON (array of strings/objects, or an object containing `posts` or `messages`). This builds a local, temporary per-message explanation timeline, classifications and a hypothetical rolling Vibe Score. A built-in example is provided. Files and text **never leave the page or persist to storage**. Reloading clears the import.

This is a preview of a planned paid feature; **there is no billing, entitlement enforcement, public profile, account sync, or platform archive adapter yet**. User imports are unverified and cannot represent a complete account's posting history. In particular, never automatically publish this estimated archive score. Limits: 8 MB / 5,000 messages / 4,000 characters per message.

Run `npm test` for archive-parser and scoring regression tests.

## Opt-in context-aware AI prototype

This build adds an optional AI-powered interpretation step through a locally running, token-protected Node companion. By default AI is **disabled**. Users must configure a local token and deliberately click **Analyze with AI** on a draft; normal typing stays completely offline. The AI provides an interpretation, confidence, and optional meaning-preserving rewrite without ever modifying the user's text automatically or changing their public score.

The companion stores no drafts, holds the provider API key only on the server, and uses the Responses API with structured JSON and `store: false`. This is for developer testing; it is **not a production authentication or payment system**. See [AI companion setup and privacy](docs/ai-companion.md).

Run `npm test` to test provider validation and local service security without making real API calls.

## AI composer review controls

The AI composer includes optional manually pasted conversation context, a review preview, and an explicit **Use AI wording** action. Changes to the draft/editor/context invalidate an older AI rewrite to prevent stale results from overwriting text. AI results remain advisory and do not change the saved historical score. Local scoring stays on by default, independent from the optional AI companion.

The composer now ignores its own context field when detecting social-media editors, preventing the panel from accidentally treating its own textarea as a social-media draft. The panel also positions itself more safely on narrow screens. See `docs/ai-companion.md`.

## Private score evidence and user data controls (v0.5)

MyVibe separates **private draft practice** from **externally verified published-message reputation**. All existing samples are user-selected and cannot establish a public reputation. Newly saved samples carry `evidenceType: "draft_sample"`, `verified: false`, and a scoring model version. A user-provided JSON field claiming `verified: true` is never sufficient proof of publication or account ownership.

The extension popup includes **My data and score evidence**, where users can view the number of recognized private samples, export locally stored scoring metadata as JSON (without the AI companion token), or delete all local score samples and optional AI configuration. Original drafts are not stored in scoring history. Older scoring schema entries remain exportable but are not silently mixed into new scores because model changes would make them incomparable.

Public badges remain disabled until there is real account authentication, platform-compliant ownership verification, server-issued evidence with anti-replay protections, consent and revocation controls, and careful scoring quality validation. No unverified draft score is publishable.

The new `extension/evidence.js` module enforces this boundary and includes regression tests. The product's future score must avoid self-selected sample gaming and permit meaningful correction and deletion.

## Read-only public Bluesky import (v0.6)

In **Archive Insights**, paste a public Bluesky handle (for example, `example.bsky.social`) and explicitly select **Fetch public posts**. The extension queries the public Bluesky AppView over HTTPS to resolve the profile's DID and load up to three pages of public author-feed posts (a maximum of 300 entries before filtering). It excludes reposts, unrelated authors, duplicate AT URIs, invalid posts, and non-text records. Results are chronological and passed into the existing per-post private explanation dashboard.

- No password, OAuth token, private-message permission or post/write permission is requested; public posts can be browsed by anyone.
- No imported text is written to extension storage or sent to the MyVibe backend. Analysis happens locally in the temporary Insights page. Reloading or clearing discards it.
- Public profile lookup and post attribution by DID are **not proof that the MyVibe user owns that Bluesky account**; this is not a connected account, and no score can be published.
- Author feeds may exclude deleted/moderated content and be incomplete; reposts are excluded; quality is still limited by the heuristic engine.
- API reliability, throttling and CORS/extension host-permission differences require browser QA before beta. Bluesky's public endpoint is documented at [public Bluesky API](https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed).
- For an actual public MyVibes badge we still need account-owner authentication, approved score publication, completeness rules, and permission revocation.

The importer is tested using mocked API responses; tests never depend on the live Bluesky network.

## Traceable Bluesky analysis exports and sharing safety (v0.7)

The private **Archive Insights** dashboard now links each recognized Bluesky post to its original public URL using validated AT URIs, preserves the source ID in each scoring event, and can export the full local message-by-message analysis as JSON or CSV. Exported files include the **original imported text**, scoring reasons, timestamps, before/after changes and source disclaimers. No export is uploaded automatically.

The data controls page lets a person record **interest in future public sharing** on this device. This is NOT a public toggle, does NOT authenticate the owner, and does NOT publish any score. It can be switched off and is erased with other local data. The extension intentionally refuses to calculate a publishable score from public feeds, self-selected drafts, or unsigned export files.

A genuine Bluesky ownership connection must use AT Protocol OAuth through an authorized client with verified identity, distinct from this read-only public lookup. We must deploy client metadata and implement the authorization, callback, token/session security and consent/revocation flow before any public badge may be enabled. See the [official AT Protocol OAuth overview](https://atproto.com/guides/about-oauth).

CSV export escapes formulas for safer opening in spreadsheet applications. The user remains responsible for sharing any downloaded files.

## Account linking foundation (developer only)

A separate local AT Protocol OAuth service is included in `server/account-oauth.js`, using the official Node OAuth client for protocol-level PKCE, PAR and DPoP. It checks callback state against a short-lived browser session, exposes a private linked DID, supports local disconnect/revocation, and **never publishes an account score or turns on a badge**. It needs real externally hosted HTTPS client metadata and a consenting test account before a live login can work. See [setup and restrictions](docs/bluesky-oauth.md).

This is not yet integrated with extension account settings or any production backend. Do not interpret the local OAuth prototype as a launch-ready identity system. Authentication is separate from the completeness, consent, contestability, and anti-manipulation requirements of public reputation scoring.

## Local account connection console

The OAuth development service also serves a simple browser page at `http://127.0.0.1:4318/`. Once properly configured with hosted AT Protocol client metadata, a developer can start a Bluesky login, see the authenticated DID and disconnect. The server now enforces a localhost Host-header check and one-hour session expiry. This page does **not** connect the extension to the account or enable score publication; see `docs/bluesky-oauth.md`.

## OAuth local onboarding improvement

The account data page can now open a local Bluesky OAuth console without moving credentials into the extension. The OAuth development server defaults to the AT Protocol `http://localhost` virtual-client exception, supported by some authorization servers. Set `MYVIBE_ATPROTO_CLIENT_ID` to a real HTTPS-hosted client metadata URL if necessary. This does not enable cross-device identity, account-based private storage, public badges or authenticated scoring; live end-to-end OAuth QA remains pending.
