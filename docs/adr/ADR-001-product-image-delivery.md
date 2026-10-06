# ADR-001: Product image delivery to browser storefronts

- **Status:** Proposed — owner decision required before changing media authorization or caching
- **Date:** 2026-10-06
- **Deciders:** Owner
- **Specification clause(s):** §2, §8.10, §9.1

## Context

Product media is currently served from `/media/products/` after store authentication middleware. The browser-facing store credential is supplied as `X-Store-Key`, which a normal `<img src>` request cannot set. The media response is `private, no-store`, and authorization checks that the active image belongs to a visible product in the authenticated store (`backend/middleware/store-context.js`, `backend/app.js`).

Phase B does not change this behavior. The project has not selected a media delivery policy.

## Decision

**Recommendation: fetch-as-blob using the existing store credential.** Keep server-side store and visibility checks, fetch the image with the existing `X-Store-Key` header, and use a browser object URL for rendering. This avoids making images anonymous and avoids introducing signed-URL secrets or expiry machinery. Owner approval is required before implementation.

## Consequences

### Positive

- Preserves current store authorization and avoids adding an unauthenticated media route.
- Requires no new signing key, database field, migration, or dependency.

### Negative / risks

- The browser client must manage object URL creation/revocation.
- Fetching media into browser memory adds client-side memory use and requires explicit cache behavior.
- The server continues to perform a database authorization check for each media request.

## Alternatives considered

- **Short-lived signed image URLs:** supports ordinary `<img>` loading and bounded caching, but requires secure URL signing, expiration, key management, and clear revocation/cache semantics.
- **Public per-store image path without a key:** simplest for `<img>` and caching, but removes the current credential check and requires an owner-approved public-media and store-visibility policy.
- **Fetch-as-blob:** recommended because it preserves the existing server-side authorization boundary without introducing signing infrastructure.

## Security, data, and compatibility impact

- No table or migration change is proposed.
- No runtime behavior changes until the owner approves an option.
- Any approved design must preserve per-store visibility checks and prevent one store's permissions or cache entry from granting another store access.

## Verification

NOT VERIFIED: Browser implementation and cache behavior are not implemented pending the owner decision.
