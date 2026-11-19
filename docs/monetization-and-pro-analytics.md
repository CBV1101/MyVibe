# MyVibe monetization: Free versus Pro

Status: product proposal, not an implemented paywall or live integration.

## Guiding principle
The free product must remain useful: users can always see their 0–100 score, basic category explanations, whether a draft triggered a warning, and how score deductions are determined. Explainability, access to correction/appeal processes and privacy controls must never be paywalled. Public visibility is voluntary and depends on verified identity and consent.

## Proposed Free ($0)
- Private Vibe Score, optional public badge once secure account linking and explicit opt-in are available.
- Inline tone detection and basic, limited constructive rewrite suggestions.
- At-a-glance score summary, basic explanation of scoring categories and most recent changes.
- Access to personal data export and deletion.
- Never sell private drafts or behavioral profiles.

## Proposed Pro (experiment at $5.99/month)
- User-authorized historical post archive import/analysis, subject to lawful platform access and API limitations.
- Post-level event timeline: text, timestamp, scoring version, detected issue type, score before/after, contribution amount, and why.
- Charts and filters for 7/30/90 days, categories of hostility/positivity, and improvements over time.
- Personalized AI analysis and meaning-preserving rewrite suggestions informed by the author's own archive.
- Deeper conversational breakdowns, nuance and alternate interpretations.
- Optional comparisons against the user's own past performance, without rankings of other people's character.

## Important product requirements
- A score displayed to others must never use unverified self-selected draft samples as if they were all published posts.
- Separate score evidence from inferred interpretation. A low-confidence signal needs a clear uncertainty label; no automatic penalty for ambiguous words, emojis or sincere criticism/religious discussion.
- Each score adjustment should be reproducible using a versioned scoring algorithm and anchored to a verified message when possible.
- If the algorithm changes, show an appropriate recalculation notice; maintain auditability without exposing sensitive text publicly.
- The free tier includes enough explanation for users to contest incorrect deductions; Pro unlocks *deep historical exploration*, not truth or due process.
- Imported content should be opt-in and revocable. Avoid requiring unnecessarily broad account permissions. Minimize storage, encrypt any retained content, and set retention/deletion policies before launch.
- Complete historical analysis cannot be guaranteed: platform APIs may restrict retrieval. Offer permitted archive upload as a possible alternative.
- Avoid storing every keystroke or private draft just to populate analytics.
- Label the existing extension's rolling score as a private, manipulable demo until verified-post ingestion is built.

## Product milestones
1. Define post-event and scoring-explanation schemas (source, message ID, timestamp, scoring model version, confidence, weighted reasons, before/after, privacy status).
2. Build opt-in historical analysis using a locally supplied sample archive and demonstrate timeline, filters and score drivers.
3. Add tested import adapters for permissible user-owned archive formats; never silently scrape private data.
4. Calibrate scoring with real contextual evaluations and test false positives before enabling user-facing historical judgments.
5. Implement billing and entitlements only after retention, cost, privacy and value experiments support Pro.
