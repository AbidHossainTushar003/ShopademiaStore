# ADR-003: Store-key and browser CORS boundary

- **Status:** Proposed — documents the current boundary; no authorization change
- **Date:** 2026-10-06
- **Deciders:** Owner
- **Specification clause(s):** §1, §2, §8.1

## Context

Public store API requests require a store key. `allowed_origins` controls which browser origins receive CORS permission; it does not prevent non-browser clients from using a valid key. A key disclosed in browser code or logs can be used by another client. The project currently applies server-side request rate limits and supports key rotation.

## Decision

Treat the store key as a rotatable public-client credential, not as a secret whose safety is guaranteed by CORS. Preserve the server-side key check and rate limits, rotate an exposed key, and do not rely on `allowed_origins` as authorization. This ADR does not make catalog or media data public without the credential.

## Consequences

### Positive

- Clarifies that CORS is a browser boundary, not API authorization.
- Encourages key rotation and server-side abuse controls without weakening current API authentication.

### Negative / risks

- A disclosed key remains usable by non-browser clients until it is revoked or rotated.
- Existing rate limits are process-local; see ADR-002.

## Alternatives considered

- **Treat the key as a private server secret:** incompatible with browser clients that must send it.
- **Remove the key requirement based on CORS origin:** rejected because non-browser clients can forge `Origin`.
- **Retain the key gate and document rotation/rate limits:** recommended and consistent with current runtime behavior.

## Security, data, and compatibility impact

- No table, endpoint, or runtime authorization changes.
- `allowed_origins` remains an exact-origin browser CORS control and is not used as server-side identity.

## Verification

Current enforcement and CORS behavior are covered by `backend/middleware/store-context.js`, `backend/app.js`, and the API tests. No key rotation or production deployment was performed in this phase.
