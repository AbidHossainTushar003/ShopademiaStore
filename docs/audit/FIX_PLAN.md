# ShopademiaStore — Prioritized Fix Plan

**Basis:** Phase 0 initial audit, 2026-10-06; Master Specification v1.0 supplied by the owner as a read-only attachment.  
**Plan status:** Phase 1 foundation hardening was approved and implemented; later phases remain proposed and require separate approval.  
**Current launch recommendation:** **NO-GO** until the P0 invariants are implemented and evidenced.

## 1. Priority order

### P0 blockers

1. **Customer authentication/account model:** reconcile current global email/password accounts with store-scoped phone identity, email OTP, guest checkout, enumeration protection, and session lifecycle in §3 D5 and §8.1/§8.3. Requires an owner-approved behavior design and explicit approval before changing authentication/session code.
2. **Admin security:** add mandatory super-admin MFA, session revocation/security versions, recovery and step-up controls, and the specified approval flow. Requires explicit approval before authentication/session changes.
3. **Financial model:** enforce BDT-only integer minor-unit calculations through one shared money/pricing engine; add snapshots, delivery charge and data-driven tax behavior without inventing rates. Tax rates and payment policies require owner-supplied decisions.
4. **Order/payment state and COD advance:** implement the specified state machines, status histories, advance submission/verification/expiry, idempotency, webhook event handling, reconciliation, and compensating action design. Payment/refund changes require explicit owner approval; provider implementation requires supplied provider documentation.
5. **Inventory consistency:** move from product-level direct stock decrement to variant-level reservations, expiration/release, movement ledger, and reconciliation while preserving the shared inventory pool invariant. Any schema change requires a per-migration impact analysis and explicit approval before execution.
6. **Permission-based authorization and audit:** replace role-name-only gates with deny-by-default permission/action/resource/store scope; add approval and append-only audit evidence for privileged actions. Define and verify least-privilege production DB grants before claiming the database account enforces append-only behavior.
7. **CORS/request-cost boundary:** remove or bound unauthenticated per-store origin DB lookups on preflight, reject non-HTTPS configured origins in production, and verify that the fix preserves registered storefront origins without allowing wildcard CORS.
8. **Store-scope provenance:** ensure administrative store-bound actions establish authorized scope from server-verified context rather than treating a URL-selected store ID as the authoritative scope; retain object-level assignment checks.

### P1 blockers

- Complete pricing, per-store price overrides, tax, coupons/redemption constraints, variants and store-specific catalog data.
- Implement the required human-readable store-code/date/sequence order number while preserving uniqueness and idempotency.
- Add returns, refunds/partial refunds, courier abstraction, admin courier selection, shipment states, COD settlement records, and associated audit/history.
- Add risk records and policies for abuse signals, per-store thresholds, and admin review.
- Add notification/provider abstractions, transactional outbox, idempotent jobs, retries/dead-letter policy, and webhook storage/reconciliation.
- Enforce database-supported numeric ranges in external identifier validators rather than allowing oversized IDs to reach query execution.
- Preserve the spec’s precedence rule: no UI or convenience requirement may weaken P0/P1 financial or isolation rules.

### P2 blockers

- Add and maintain OpenAPI 3.x; validate route inventory and implementation contracts in CI.
- Complete adapter boundaries for payment, courier, notification, storage, search, and tax. Do not fabricate provider endpoints or fields.
- Bring the current routes/controllers/services/repositories structure into the specified domain boundaries where a phase requires it; avoid a wholesale rewrite.
- Record owner-approved architecture choices as ADRs; do not silently settle OWNER-REVIEW items.

### P3 issues

- Configure explicit HTTP, DB-query, upload, and outbound-provider timeouts; add bounded retry/circuit-breaker/load-shedding behavior as each real integration is introduced.
- Add appropriate observability: structured fields, metrics, traces, provider/webhook correlation, SLOs, alerts, and runbooks.
- Add tier-aware caching, shared rate limiting, and worker/queue capability only when the selected hosting tier provides them; retain safe T0 behavior and do not claim unavailable capabilities.
- Establish CI/CD gates (tests, contract validation, SAST, dependency/secret/license checks, SBOM, migration review/dry-run, staging smoke, security/load checks, and manual approval) based on actual tooling and release environment.
- Select and document achievable backup retention/RPO/RTO and perform isolated restore drills. Existing backup prose is not restore evidence.

### P4 issues

- Implement the store-aware storefront and central admin panel with plain HTML/CSS/JavaScript and `fetch()` unless an approved ADR changes the locked D2 decision. Root `index.html` is currently empty; no existing UI was found to preserve.
- Add accessibility and visual regression checks when frontend work is approved.

### P5 / tier-gated future work

- Activate edge/WAF, multi-zone/multi-region HA/DR, Redis/BullMQ, replicated databases, object storage/CDN, advanced anomaly detection, and additional providers only when the hosting tier and provider agreements support them. Keep architecture seams ready without claiming inactive capabilities.

## 2. Recommended implementation sequence

Follow the Master Specification roadmap and stop after each approved phase and phase audit. The repository’s prior implementation sequence does not supersede this roadmap.

| Phase | Scope recommendation | Prerequisites / stop gates |
|---|---|---|
| 0 — Audit/governance | Current phase: record actual state, evidence, priorities, and gaps. | Complete this report and fix plan. Do not implement feature code without phase approval. |
| 1 — Foundation | **Completed in this session:** bound unauthenticated store-scoped preflight DB lookups; enforce HTTPS for production global/per-store origin configuration and CORS responses. | Verified by the Phase 1 audit report and tests. Proxy trust and timeout work remain outside the approved scope. |
| 2 — Database | Design additive schema for the approved domain phase and verify test isolation, migration behavior, and least privilege. | Before each migration, produce the required impact analysis; stop for human approval before writing/executing migration. Never use production data for a test. |
| 3 — Multi-store | Align customer/store identity and store-specific data boundaries with approved policy. | Requires owner decision on account identity and any account-data migration; stop before auth or data backfill. |
| 4–5 — Catalog/media | Add variants, per-store catalog/pricing seams, and media abstraction as separately approved scopes. | Keep API-only DB boundary; review upload/storage security. |
| 6–7 — Authentication/RBAC/audit | Implement customer OTP/session model, admin MFA, permission RBAC, step-up/approval, and audit guarantees. | Explicit owner approval before auth/session changes; no assumed email/SMS/provider behavior. |
| 8–10 — Inventory/pricing/checkout | Add reservation ledger, shared money/pricing/tax/coupon foundations, checkout/order/advance states. | Owner tax/refund/advance decisions; migration impact analysis and explicit approval; prove concurrency and rollback with isolated MySQL tests. |
| 11 — Payments | Implement provider abstraction and manual/automatic verification only against supplied current provider documentation. | Explicit owner approval for payment logic; no invented bKash API, event fields, or credentials. |
| 12–13 — Fulfillment/returns/notifications/jobs | Add approved courier, return/refund, COD settlement, notification, outbox, and worker flows. | Owner policy decisions and provider documentation; idempotency and reconciliation tests. |
| 14–15 — Admin/storefront | Implement operator UI and store-aware storefront against documented API contracts. | Do not expose secrets in browser code; verify role/permission checks server-side and text-safe rendering. |
| 16–19 — Security/operations/privacy/testing | Complete edge/security controls, observability/DR/CI-CD, privacy workflows, and full required test pyramid. | Respect hosting-tier gates; tests must run against isolated resources only. |
| 20 — Launch gate | Produce requirement-by-requirement compliance evidence and choose GO / NO-GO / GO WITH ACCEPTED RISKS. | No GO without evidence for P0/P1, migration, security, and release checks. |

## 3. First candidate change-impact analysis

This is planning evidence for the proposed Phase 1 foundation slice only. It is **not approval to change these files**.

| Impact area | Candidate impact |
|---|---|
| Files | `backend/middleware/store-context.js`, `backend/app.js`, `backend/config/config.js`, and focused API/config tests in `backend/test/`. |
| Tables | None. No database schema or data change is needed for the initial CORS/configuration fixes. |
| Endpoints | Store-scoped CORS preflight behavior for `/api/v1/` store routes and production startup validation of `ALLOWED_ORIGINS`; no intended business response-shape change. |
| State machines | None. |
| Security invariants | Do not trust a public store key as privileged authorization; do not allow wildcard CORS; avoid unauthenticated preflight database amplification; trust only registered origins and only explicitly trusted proxy addresses if configured. |
| Data migration | None. |
| Backward compatibility | Production configurations containing `http:` origins would fail fast and need correction to HTTPS. Development HTTP behavior can remain explicitly environment-scoped. Preflight must remain compatible with authorized storefront origins. |
| Rollback / forward-fix | No database rollback. If an approved change blocks a valid deployment origin, correct the allow-list/configuration or forward-fix the exact origin-handling defect; do not weaken to wildcard CORS or blanket proxy trust. |
| Testing strategy | Verify allowed HTTPS and rejected production HTTP origins; exercise approved/disallowed store origins; prove repeated unauthenticated preflights do not cause repeated store-origin DB lookups or bypass an early protective limiter; assert ordinary GET responses and store isolation are unchanged. Run the focused tests and full `npm test`. |

## 4. Mandatory gates for later changes

- **Migrations/data changes:** produce the full requested change-impact analysis (files, tables, indexes, endpoints, state machines, security invariants, data migration, compatibility, rollback/forward-fix, tests), then stop for owner approval before writing or running the migration.
- **Authentication/sessions:** stop for explicit owner approval before changing identity policy, OTP, MFA, token/session format, refresh/revocation, recovery, or account migration.
- **Payments/refunds:** stop for explicit owner approval and supplied current provider documentation before implementing provider or refund behavior. No real payment calls in tests.
- **Secrets:** do not create, disclose, print, or alter real credentials; production secret-manager changes require explicit approval.
- **Production deployment/data deletion:** do not deploy, alter production, or delete financial/audit data.
- **Business decisions:** request owner input for unresolved OWNER-REVIEW items, including tax rates, advance/refund policies, phone verification policy, and hosting tier.
- **Phase control:** do only the approved phase, produce its phase audit report, and stop before starting the next phase.
