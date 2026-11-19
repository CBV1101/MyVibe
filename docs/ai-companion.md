# MyVibe opt-in AI companion (development build)

This is a **developer-only local AI analysis prototype**, not the production architecture. It complements the offline rule-based writing assistant and does not alter scores, save drafts or publish results.

## Setup

Requires Node.js 20+, an OpenAI API key and a Responses API-capable model available to your account. The API is accessed through the server, **never directly from the extension**.

1. Set three environment variables in the terminal running the companion: `OPENAI_API_KEY` (secret server-side API key), `MYVIBE_MODEL` (the model you selected), and `MYVIBE_LOCAL_TOKEN` (a long random secret of at least 24 characters).
2. Run `node server/server.js`. This binds only to `127.0.0.1:4317`. Do not expose this port to the internet.
3. Load or refresh the unpacked `extension` in Chrome/Edge.
4. In the extension popup, select **Configure optional AI companion**. Enter the **local token** (not the OpenAI key) and enable AI. It stays disabled unless you opt in.
5. On a supported social composer, write text and click **Analyze with AI**. That action sends **only that draft** to your local service and then to the configured AI provider. Other keystrokes are not transmitted. To stop using AI, disable it and clear the token.

## Security and privacy

- No AI request occurs on ordinary typing, on opening a social site, or when saving a local heuristic score. Requests require a click.
- The companion rejects missing tokens, overlong drafts, unsolicited website origins, and excessive volume. The token is stored in extension-local storage, so this is suitable **only for local development**, not customer accounts or a hosted API.
- The companion doesn't persist or log messages. Requests are sent to the AI provider with `store: false`, but provider processing and retention policies may still apply. Review provider terms before sending sensitive material.
- The response is checked against a strict JSON shape and low-confidence negative outcomes are converted to neutral/uncertain. This minimizes but does not eliminate false positives.
- AI feedback is **advisory**, never auto-applied to text and never used as a verified public reputation score.
- The service has no public CORS permissions and binds to IPv4 loopback only.
- A full production launch needs secure account authentication, HTTPS, paid entitlements, rate limiting per user, abuse mitigation, data processing terms, internationalization, and adversarial evaluation.

## Limitations

No conversation thread is automatically captured or transmitted; context is optional on the server side for future consent-based workflows. AI can still produce mistaken, biased or misleading interpretations. The extension's 0–100 history is an experimental **local demo**, not a full social-account audit.
