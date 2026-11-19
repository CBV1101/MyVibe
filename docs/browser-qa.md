# MyVibe browser QA and release gate

This suite tests browser DOM interactions in **headless Chromium** using Playwright. It loads the real MyVibe `tone.js`, `review.js`, `evidence.js`, and `content.js` into a controlled simulated Bluesky composer page.

## Run

Use Node 22+, then:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

GitHub Actions runs this as a separate `chromium-smoke` job, installing Chromium and its Linux dependencies. The original Node test and curated tone evaluation job still run independently.

## What we test

- Normal disagreement versus direct personal insults in an editable social composer
- No AI transmission while typing, focusing, or saving local sample history
- No raw message text in saved history entries
- Explicit user-triggered AI requests and user-supplied context
- An AI rewrite is previewed, not applied automatically; the user's click applies it
- Late AI responses cannot rewrite a draft that was changed or moved to another composer
- The extension's own context input cannot be mistaken for a social-platform composer
- Chrome Manifest V3 references valid packaged assets and keeps permissions limited
- No existing client-side code authorizes public reputation publication

## Limitations and future release gate

This is a **Chromium DOM smoke test with mocked Chrome extension APIs**, not an independently verified run in a real signed extension on each supported live social platform. Mock social-page markup cannot cover actual X, Reddit, Threads, and Bluesky webapp DOM changes. The AI provider response is mocked; no API credentials or messages are sent to a third party.

Prior to real beta invite: test the unpacked extension on actual supported websites, including contenteditable editors, navigation and virtualized posts; complete live provider OAuth against a consenting Bluesky test account; assess real-world scoring quality; and conduct security, accessibility, and privacy testing. Keep public scores/badges and billing disabled until those gates pass.
