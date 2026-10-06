# Phase 1 Audit Report — Foundation CORS Hardening

**Date:** 2026-10-06  
**Scope approval:** Owner approved the limited Phase 1 scope: preflight database-lookup protection, production HTTPS-origin validation, and related tests.  
**Outcome:** Implemented and verified within the approved scope. This report does not certify overall Master Specification compliance or launch readiness.

## 1. Scope

- Bound store-scoped unauthenticated `OPTIONS` requests before any store-origin database lookup.
- Require HTTPS for production global `ALLOWED_ORIGINS`, store creation/update origin input, and CORS response decisions, including legacy HTTP origins already present in a store record.
- Preserve development HTTP support for local origins and preserve exact per-store origin allow-list behavior.
- Add regression tests and document the behavior.

No auth/session redesign, payment/refund changes, migrations, database access, production deployment, secrets handling, or data deletion were performed.

## 2. Files changed

### Created

- `backend/test/origin-validation.test.js`
- `docs/audit/INITIAL_REPOSITORY_AUDIT.md`
- `docs/audit/FIX_PLAN.md`
- `docs/audit/PHASE_1_AUDIT_REPORT.md`

### Modified

- `backend/README.md`
- `backend/app.js`
- `backend/config/config.js`
- `backend/controllers/admin-stores.controller.js`
- `backend/middleware/store-context.js`
- `backend/routes/v1/admin-stores.routes.js`
- `backend/support/app-fixture.js`
- `backend/test/api.test.js`
- `backend/validators/stores.validators.js`

No dependency manifest or lockfile changed.

## 3. Tables changed

None. No migrations were written or run, and no database was contacted.

## 4. APIs changed

- No route or successful response shape changed.
- Store-scoped CORS preflights now receive HTTP 429 with the standard error envelope and `Retry-After` after 120 requests per minute per IP. The limit is applied before `listStoresForOrigin` can query MySQL.
- In production, global or per-store HTTP origins are rejected during configuration/input validation. CORS also withholds `Access-Control-Allow-Origin` for HTTP origins retained in pre-existing store data.
- Development may continue to use HTTP origins, allowing local development.

## 5. Security impact

- Limits unauthenticated repeated preflight requests that previously performed an origin lookup before the catalog limiter.
- Prevents production CORS authorization for HTTP origins, even if a legacy per-store row contains one.
- Rejects attempts to create/update production store configuration with HTTP origins before persistence.
- Retains exact-origin matching and does not introduce wildcard CORS, credential sharing, origin caching, or changed store-key authorization.
- Rate limiting remains process-local and IP-based. With the current `trust proxy = false`, clients behind a reverse proxy may share an IP bucket; deployment-specific proxy trust remains outside this approved scope.

## 6. Data-integrity and business-rule impact

- No tables, persisted rows, financial values, stock, or state machines changed.
- Store-origin configuration is input-validated before persistence; no existing database values were rewritten.
- Preflight origin lookups remain dynamic so store origin changes do not wait for an application cache TTL.

## 7. Tests executed

1. Focused: `node --test test\api.test.js test\origin-validation.test.js` from `backend/`.
2. Full configured suite: `npm.cmd test` from `backend/`.
3. Editor diagnostics for every modified JavaScript file.
4. `git diff --check` and repository status inspection.
5. Static security review of the Phase 1 diff by the security-review agent.

## 8. Exact results

- Focused suite: **17 tests; 17 passed; 0 failed; 0 skipped**.
- Full suite: **26 tests; 25 passed; 0 failed; 1 skipped**. The skipped test is the MySQL integration test.
- Editor diagnostics: no errors reported in the modified JavaScript files.
- `git diff --check`: no whitespace errors reported.
- Security review: no high-confidence vulnerabilities found in the reviewed Phase 1 changes.
- Regression measurement: the mock-pool test sent 121 store-scoped preflights from one IP; the first 120 were handled and caused 120 origin lookups, and the 121st received 429 without a 121st lookup. The registered HTTPS origin still received CORS permission.
- Production-origin tests confirmed that global production origin parsing rejects HTTP, store create/update validation rejects HTTP, and CORS withholds the allow-origin header for an HTTP origin retained in mock store configuration.

During the first focused test run, two assertions failed: one expected a 204 status for a disallowed preflight (Express continued to its automatic OPTIONS handling, returning 200 without an allow-origin header), and one expected a narrower validation-message substring. The assertions were corrected to verify the security property and actual validation message. The final focused and full runs passed.

## 9. Known limitations

- No live MySQL performance or behavior was measured. The lookup-count test uses the existing in-memory mock pool.
- The 120/minute limiter uses the default in-process store. It is not shared across API instances and can group clients behind an untrusted/unconfigured proxy.
- Distributed denial-of-service protection, WAF/CDN controls, global load shedding, and hosting-specific proxy configuration were not part of this approved phase.
- Other P0/P1 gaps from `INITIAL_REPOSITORY_AUDIT.md` remain unresolved; overall readiness remains **NO-GO**.

## 10. Deferred work

- Proxy-aware rate-limit identity and distributed limiter storage (deployment/hosting-tier dependent).
- Remaining Phase 1 foundation work, including explicit request/query timeout policy and API contract inventory.
- Customer/admin authentication, RBAC, money/pricing, payment, inventory, migration, storefront, and other phases in `FIX_PLAN.md`.

## 11. ADRs

None created. This bounded guard uses the already-installed `express-rate-limit` package and existing origin storage; it does not change a locked architecture decision. Unresolved OWNER-REVIEW decisions remain deferred.

## 12. Migration evidence

No migration files changed; no migrations were run; no database was contacted.

## 13. Security evidence

- The route middleware invokes the preflight limiter before `storesRepository.listStoresForOrigin` (`backend/middleware/store-context.js`).
- Production origin parsing and store input validation enforce HTTPS (`backend/config/config.js`, `backend/validators/stores.validators.js`, `backend/controllers/admin-stores.controller.js`, `backend/routes/v1/admin-stores.routes.js`).
- The app’s CORS callback denies non-HTTPS production origins, including legacy values (`backend/app.js`).
- Regression coverage exercises the limiter ordering, allowed HTTPS preflight, production legacy-HTTP CORS denial, and production store-origin input rejection (`backend/test/api.test.js`, `backend/test/origin-validation.test.js`).
- Static security review found no high-confidence vulnerabilities in the reviewed Phase 1 changes. This was not a live attack simulation.

## 14. Performance evidence

The mock-pool test established a local bound of at most 120 origin lookups per IP within the one-minute limiter window; the next request is rejected before lookup. This demonstrates limiter ordering and the configured cap only. It is not a real-MySQL benchmark or an overall performance improvement claim.

## 15. Remaining specification gaps

See the P0–P5 assessment in `INITIAL_REPOSITORY_AUDIT.md` and the proposed sequence in `FIX_PLAN.md`. In particular, authentication/MFA, permission-based RBAC, BDT-only pricing, the complete order/payment state machines, COD advance, inventory reservations/ledger, provider boundaries, OpenAPI, frontend, CI/CD, and live database/security verification are not completed by this phase.

## 16. Stop condition

Phase 1 is complete. No next phase was started. Await explicit owner direction before additional implementation.
