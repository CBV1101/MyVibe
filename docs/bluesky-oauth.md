# MyVibes Bluesky OAuth: developer foundation

**Status: development-only ownership proof of concept, not live production account login or public scoring.**

The separate loopback service integrates the official @atproto/oauth-client-node SDK. The SDK handles PKCE, PAR, DPoP and protocol validation. The app additionally binds each callback to the browser that initiated the flow. Neither a handle nor a fetched public feed proves account ownership.

## Testing a development login

AT Protocol defines a special local development client ID: `http://localhost` with query parameters for a loopback `redirect_uri` and scopes. Authorization servers **may** support this exception; support is optional. The local server now defaults to:

- Client ID: `http://localhost?redirect_uri=http%3A%2F%2F127.0.0.1%3A4318%2Foauth%2Fcallback&scope=atproto`
- Redirect URI: `http://127.0.0.1:4318/oauth/callback`
- Scope: `atproto`

Run `npm install`, then `npm run oauth:dev`. Open `http://127.0.0.1:4318/` in the same browser that will complete login. If the authorization server does not support the localhost exception, publish AT Protocol-compliant client metadata at an HTTPS URL you control and set `MYVIBE_ATPROTO_CLIENT_ID=https://your-actual-domain.example/client-metadata.json` before starting the service.

The extension's **My data and score evidence** page now includes an **Open local Bluesky account console** button. It simply opens the loopback page and does not import OAuth tokens or the authenticated DID into extension storage. This is a separate local session, not extension login or cross-device authentication.

A live OAuth smoke test is still required, as mocked tests cannot establish that any particular authorization server accepts the development client ID. The browser page reports the resulting DID after authentication, and `GET /account` confirms local status.

## Security boundaries

- Per-browser, short-lived random authorization state; callback must complete in the same browser, once only
- SDK validates authorization callback and exchanges code; application separately checks returned state and DID
- Secure random session cookie with HttpOnly and SameSite=Lax (no TLS here because loopback development only)
- The account endpoint never returns a publishable score
- Disconnect requires a same-origin request and a separate CSRF token; disconnect removes the session and attempts SDK revocation
- No session tokens or credentials are saved in the extension or included in score exports
- The production service will require durable encrypted credentials, HTTPS, real user accounts, CSRF and origin hardening, persistent session state, consent audit, rate limits and independent security review

## Why public scores remain disabled

OAuth can establish account possession, but it cannot prove that fetched historical posts are complete or appropriate to publish as a reputation score. Public badges need a separate verified-post scoring and coverage process, explicit publication consent, revocation, score correction rights and an external score service. This development server intentionally has no publication endpoint.

## Test

Run npm run check and npm test. Tests use a mocked OAuth SDK and do not contact a real provider. Live login requires hosted metadata and a consenting test account.

Sources: https://atproto.com/specs/oauth and https://atproto.com/guides/about-oauth and https://github.com/bluesky-social/atproto/blob/main/packages/oauth/oauth-client-node/README.md

## Local account console

The development OAuth service now serves a browser interface at `http://127.0.0.1:4318/`. Enter your Bluesky handle to start OAuth; after authorization, return to the root page to view the authenticated DID or disconnect. The callback currently displays a JSON confirmation rather than automatically redirecting to the console.

The account page uses same-origin JavaScript/CSS, a restrictive Content Security Policy, and a Host-header restriction to `127.0.0.1` and the running port to reduce DNS-rebinding risk. Local account sessions are removed from memory after one hour. The account endpoint reports **no public score** regardless of login state. This is a development console, not consumer login and not an extension OAuth connection.

A real Bluesky login needs either an authorization server that accepts the protocol's optional localhost client-ID exception or a valid hosted HTTPS OAuth client metadata document. The end-to-end SDK/provider flow and browser behavior require manual validation before release.

## Private, owner-bound post review

Once authenticated in the **local account console**, select **Analyze my recent public posts**. This makes a same-origin browser request to `GET /account/posts`. The server uses **only the DID from the verified in-memory OAuth session** and requests a bounded sample from the fixed public Bluesky AppView endpoint. There is no caller-supplied DID/handle override.

The result is rechecked for DID consistency. The account console uses the existing local, heuristic scoring engine in the browser to produce a **private, temporary practice score** and per-post explanations, with links back to original public posts. This is not a complete account history or verified public reputation: scoring still lacks context and the feed may be incomplete.

- The endpoint requires a current OAuth session, disallows account-selection query parameters, rejects cross-origin/cross-site reads and limits repeat requests to once every 15 seconds per session.
- Results are not saved by the local account server or persisted by the console. Closing or reloading the console clears the in-page analysis. The **Clear analysis** button erases the in-page report immediately.
- If disconnected or expired, the server rejects requests and the console removes the report when session state is refreshed.
- The server never returns a publishable score; `publicScore` remains `null` and `publicBadgeEnabled` stays `false`.
- This builds a real ownership-bound *review* path only. It is not a shared cloud user identity, durable posting proof, or entitlement control. Manual live OAuth provider and browser QA remain outstanding.

The fetcher and account API have mocked regression tests for DID binding, unrelated posts, replayed requests and cross-site attempts.

## Account review safeguards and filters

The account review endpoint now requires the per-session CSRF header even for reads. This prevents a generic local request, including a cross-site navigation, from fetching the author's post sample without the same-origin account page participating. Only a narrow set of server-defined fields is returned, and messages are bounded by the same 4,000-character rule as the public importer. No response may contain a public reputation score.

The console rejects malformed/foreign/duplicate posts, sorts the review chronologically and displays summary counts and positive/neutral/negative filters. Timeline entries remain local to the browser tab; moving between accounts, disconnection, or an unavailable account invalidates in-memory results. Clearing in-progress reviews also restores the Analyze button. This addresses a stale-response/UI race discovered in the development implementation.

**Next release gate:** Perform a real account OAuth and browser smoke test, validate scoring against human-reviewed samples, and assess API/coverage limitations. These automated checks do not establish real-provider compatibility.
