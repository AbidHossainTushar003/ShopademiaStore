# Phase B Audit Report — Safe Runtime Fixes

**Date:** 2026-10-06  
**Approved phase:** B  
**Outcome:** Selected N2, N3, N6, N7, N12, N16, N17 (non-dependency portion), and N19 addressed. N18 was explicitly deferred by the owner. N5 has an ADR recommendation only; media delivery was not changed.

## 1. Verified findings and disposition

| Finding | Result | Evidence |
|---|---|---|
| N2 — proxy trust and admin login limits | Fixed. `TRUST_PROXY` defaults to disabled, accepts a hop count or explicit IP/CIDR list, rejects `true` and wildcard forms, and is applied by Express. Failed-login limits use the normalized email together with the rate limiter's IP key. | `backend/config/config.js`, `backend/app.js`, `backend/routes/v1/admin-auth.routes.js`; tests for parser/application and separate email buckets. |
| N3 — missing server-error logs | Fixed. Unhandled 5xx and unexpected 4xx errors emit one structured JSON error record with request ID, request method/path, status, error class, and a safe static message. Stack is logged only outside production. | `backend/middleware/error-handler.js`; forced production 500 and unexpected 4xx tests. |
| N5 — media cannot be used by ordinary `<img>` requests | No runtime change. ADR-001 compares signed URLs, public paths, and fetch-as-blob, recommending fetch-as-blob pending owner decision. | `docs/adr/ADR-001-product-image-delivery.md`. |
| N6 — missing image file causes 500 after DB commit | Fixed. Missing files are treated as already removed. Other cleanup failures are logged without changing the successful committed result. | `backend/services/admin-catalog.service.js`; tests cover ENOENT and another cleanup failure. |
| N7 — upload cleanup can hide the original error | Fixed. Cleanup uses `Promise.allSettled`, logs non-ENOENT cleanup failures safely, and rethrows the original upload/transaction error. | `backend/services/admin-catalog.service.js`; regression test asserts the original error identity is preserved. |
| N12 — Phase 1 and A work uncommitted | No commits or staging performed. A separate commit plan is recorded below. | Git status inspection; no staged file list. |
| N16 — CORS is not API authorization | Documented. The store key remains required; documentation says CORS is browser-only and a leaked key remains usable outside browsers until rotated. | `docs/deployment.md`, `docs/adr/ADR-003-store-key-and-cors-boundary.md`. |
| N17 — upload memory and image processing | Aggregate file bytes are now capped at 15 MiB per request, while retaining five files and the 5 MiB per-file ceiling and signature checks. No image-processing dependency was added. | `backend/middleware/product-image-upload.js`, `docs/deployment.md`, upload test. |
| N18 — shipping phone/country validation | Deferred unchanged at the owner's direction because the Master Specification does not define accepted shipping countries or phone/postal formats. | Owner selected “Defer N18”; `backend/validators/order.validators.js` was not changed for shipping validation. |
| N19 — deep order pagination | Fixed. Customer and admin order-list validation rejects a computed SQL offset greater than 10,000 with HTTP 422. | `backend/validators/order.validators.js`, both order list controllers/repository paths, and boundary test. |

## 2. Files changed

### Created

- `backend/test/openapi-routes.test.js` — checks exact method/path parity between route declarations, static media operations, and OpenAPI.
- `backend/test/runtime-hardening.test.js` — tests pagination, image cleanup behavior, and unexpected 4xx logging.
- `backend/test/upload-limits.test.js` — exercises aggregate and per-file upload limits through HTTP.
- `docs/adr/ADR-001-product-image-delivery.md` — options and recommendation; owner decision pending.
- `docs/adr/ADR-002-shared-rate-limit-storage.md` — records process-local limiter limits and defers shared storage.
- `docs/adr/ADR-003-store-key-and-cors-boundary.md` — records the store-key/CORS boundary.
- `docs/audit/PHASE_B_AUDIT_REPORT.md` — this report.

### Modified

- `backend/.env.example` — added disabled-by-default `TRUST_PROXY`.
- `backend/.env.production.example` — added disabled-by-default `TRUST_PROXY`; placeholders otherwise unchanged.
- `backend/app.js` — applies validated proxy trust configuration.
- `backend/config/config.js` — validates `TRUST_PROXY`.
- `backend/middleware/error-handler.js` — structured logging for unhandled 5xx/unexpected 4xx.
- `backend/middleware/product-image-upload.js` — bounded aggregate in-memory upload storage.
- `backend/routes/v1/admin-auth.routes.js` — failed-login limit key includes normalized email and IP.
- `backend/services/admin-catalog.service.js` — best-effort post-commit image cleanup and original-error preservation.
- `backend/support/app-fixture.js` — test fixture passes proxy settings and exposes its app for configuration verification.
- `backend/test/api.test.js` — login-limit isolation and production-safe 500 logging tests.
- `backend/test/origin-validation.test.js` — `TRUST_PROXY` parser and Express-application tests.
- `backend/validators/order.validators.js` — 10,000-row maximum SQL offset validation.
- `docs/deployment.md` — proxy trust, rate-limit, store-key/CORS, upload, image reconciliation, and pagination guidance.
- `docs/openapi.yaml` — documents HTTP 422 on customer/admin order-list operations.

The worktree also contains earlier uncommitted Phase 1 and Phase A files/changes. They were not intentionally changed as part of Phase B. In particular, root README, backend README, store-context middleware, store controllers/routes, and store validators remain part of earlier work.

## 3. Tables, dependencies, and APIs

- **Tables/migrations/data:** None. No database connection, migration, or data mutation was performed.
- **Dependencies:** None added or changed.
- **Routes:** No route was added or removed.
- **Response shapes:** Existing success/error envelopes are retained.
- **Behavioral API changes:** Order-list requests with computed `OFFSET > 10000` now receive the existing 422 validation envelope. Admin image uploads exceeding 15 MiB of combined file bytes now receive the existing 413 upload-limit envelope. Image deletion no longer returns a false 500 when the file is already missing after the database change committed.
- **N5 media delivery:** Existing store-key authorization and `private, no-store` behavior remain unchanged pending the ADR decision.

## 4. Security, compatibility, and limitations

- `TRUST_PROXY` stays disabled unless an operator explicitly sets a verified hop count or trusted IP/CIDR list. The actual deployment topology was not supplied; do not enable proxy trust until its exact path is known.
- Failed-login counters and all existing in-memory limiters are per process and reset at restart. ADR-002 proposes revisiting shared storage after the hosting topology is known; Redis was not introduced.
- Uploads remain in memory but are bounded at 15 MiB of file bytes per request. Image dimensions and metadata are not inspected or rewritten. Adding an image library requires separate approval.
- File cleanup failures other than `ENOENT` are logged without leaking filesystem paths; a reconciliation note is in `docs/deployment.md`.
- The store key remains a credential required by the API. CORS is not presented as a defense against non-browser clients.
- N18 input constraints were not invented. The current generic country/phone validation remains pending an owner-defined policy.
- No production deployment, proxy configuration, key rotation, image-delivery implementation, or shared rate-limit service was performed.
- No real `.env` file was read or modified. Only the placeholder-only `.env.example` and `.env.production.example` were edited; no credentials were printed.

## 5. Tests and verification

Baseline before Phase B: `npm.cmd test` from `backend/` — **26 tests; 25 passed; 0 failed; 1 skipped**. The skipped case is the MySQL integration test for constraints, checkout atomicity, stock locking, and customer/store isolation.

Final command: `npm.cmd test` from `backend/` — **37 tests; 36 passed; 0 failed; 1 skipped; 0 cancelled**. The skipped case is the same MySQL integration test.

New tests exercised:

- Email-isolated failed-login limiting.
- Forced production server error logging without internal message/stack leakage.
- `TRUST_PROXY` accepted/rejected forms and Express application.
- 10,000-row pagination boundary and 422 rejection beyond it.
- Post-commit image removal when the file is missing and when another cleanup error occurs.
- Failed-upload cleanup preserving the original error.
- Unexpected 4xx structured logging and non-production stack behavior.
- Aggregate upload rejection above 15 MiB and acceptance of a 5 MiB single file.
- Exact OpenAPI operation parity with declared routes and static media GET/HEAD.

`git diff --check` reported no whitespace errors; Git printed expected CRLF-to-LF warnings because of the existing `.gitattributes`. Editor diagnostics reported no errors in the inspected modified source/test files.

`backend/.env.test` is absent. The guarded `npm run test:db` was not run, and no database was touched.

NOT VERIFIED: Formal OpenAPI 3.1 schema validation; the new test checks exact operation path/method parity without adding a YAML validator dependency.

NOT VERIFIED: A production proxy topology or rate-limit behavior across multiple API processes; no target deployment environment was provided.

## 6. Commit plan

No files were staged and no commits were made. After the already-dirty work is settled, keep these concerns separate:

1. `chore: normalize repository line endings` — separate normalization-only commit.
2. Phase 1 CORS hardening.
3. Phase A governance/documentation.
4. Phase B runtime fixes.

Do not stage or commit the existing Phase 1/A work without owner direction.

## 7. Next owner decisions

- Choose or revise the ADR-001 image-delivery recommendation before changing media authorization or caching.
- Supply the exact production trusted-proxy topology before setting `TRUST_PROXY` to a nonzero value.
- Decide whether a shared rate-limit store is needed after hosting topology is selected.
- Define the accepted shipping country, phone, and postal formats before implementing N18.
- Approve an image-processing dependency separately if dimension checks or re-encoding are required.

**PHASE B COMPLETE — AWAITING OWNER APPROVAL.**
