# MyVibes Bluesky OAuth: developer foundation

**Status: development-only ownership proof of concept, not live production account login or public scoring.**

The separate loopback service integrates the official @atproto/oauth-client-node SDK. The SDK handles PKCE, PAR, DPoP and protocol validation. The app additionally binds each callback to the browser that initiated the flow. Neither a handle nor a fetched public feed proves account ownership.

## Before testing a real provider login

1. Publish AT Protocol client metadata at a public HTTPS URL on a domain you control. The auth server must fetch the document with HTTP 200 and application/json. Do not use a placeholder domain.
2. For local prototype metadata, use the native public-client flow: token_endpoint_auth_method none, application_type native, dpop_bound_access_tokens true, scope atproto, response_types code, grant_types authorization_code and refresh_token, callback http://127.0.0.1:4318/oauth/callback. Follow the AT Protocol specification.
3. Run npm install, then set MYVIBE_ATPROTO_CLIENT_ID to the actual hosted HTTPS client metadata URL and run npm run oauth:dev.
4. On the same computer visit http://127.0.0.1:4318/oauth/start?handle=YOUR-HANDLE in your browser. The OAuth provider should then request consent.
5. The callback returns a JSON confirmation of the DID only on success, and a local HttpOnly session cookie. GET http://127.0.0.1:4318/account shows local linked state. It always reports publicScore null and publicBadgeEnabled false.

This proof of concept binds only to 127.0.0.1, has in-memory OAuth state/session stores, and loses all sessions on restart. Never expose the service publicly. The local connection is not synchronized to the browser extension or an account database. Do not claim an account is linked across devices.

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
