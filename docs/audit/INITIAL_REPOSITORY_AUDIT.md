# Initial Repository Audit Against the ShopademiaStore Master Specification

**Audit phase:** Phase 0 — discovery and governance  
**Audit date:** 2026-10-06  
**Repository revision:** `06d7926` (`main`, initially clean)  
**Audit disposition:** **NO-GO for launch; implementation phases require explicit approval**  
**Scope:** Read-only inspection and baseline checks. This report is an initial compliance assessment, not a claim that every requirement has been implemented or verified.

## 1. Authority, method, and limits

The owner supplied **ShopademiaStore — Master Specification v1.0** as a read-only attachment. Its header says “DRAFT FOR OWNER REVIEW”; this audit treats the supplied document as the current comparison baseline, while recording unresolved OWNER-REVIEW decisions as unresolved. The specification is not present as a tracked repository file. It was not copied into the repository.

Inspected the tracked repository inventory, project READMEs, deployment guidance, package manifest and lockfile, application/configuration/server code, migrations, routes, controllers, services, repositories, middleware, validators, scripts, tests, license, and root HTML entry. `.env` contents were not read. The tracked environment files are examples/templates only. No database connection, migration, data mutation, dependency installation, or application-code change was performed.

Repository governance materials were checked for: `CLAUDE.md`, `PROTECTED_FILES.md`, `MASTER_SPECIFICATION.md`, ADRs, phase documents, audit templates, and CI workflow files. None were found in the tracked repository. The only tracked project documentation found is the root/backend README, `docs/deployment.md`, and `LICENSE`.

## 2. Baseline evidence

- Repository: `main` at `06d7926` (`Add guarded MySQL integration workflow`); initial `git status --short --branch` was `## main...origin/main`.
- Runtime: Node.js `v24.21.0`; npm `11.19.0`; package engine declares Node.js `>=20` (`backend/package.json`).
- Tests: `npm test` (invoked as `npm.cmd test` because this host blocks PowerShell script execution) completed with **21 tests: 20 passed, 0 failed, 1 skipped**. The skipped test is the MySQL integration case for constraints, checkout atomicity, stock locking, and customer/store isolation (`backend/test/database.integration.test.js`).
- Dependencies: `npm audit` reported **0 vulnerabilities**; `npm ls --depth=0` completed and listed the locked direct dependencies. This is a point-in-time package audit, not a substitute for a release pipeline.
- Database: No live schema, grants, migrations, transaction behavior, or backup/restore was exercised in this audit. The MySQL integration test did not run.
- Frontend: root `index.html` is **0 bytes**. No separate storefront or admin frontend is present in the tracked file inventory.
- Worktree: initial state was clean. Only the two requested audit documents are intended to be added by Phase 0.

## 3. Executive assessment

The repository is a functioning, layered Node.js/Express/MySQL API foundation with catalog, store, customer account, cart, checkout, and order functionality. It is **not compliant with the full Master Specification**: multiple P0 security/financial/business invariants and P1 commerce requirements are absent or materially different. The current test suite provides useful mock-backed coverage, but its only database integration test was skipped and does not provide evidence of live MySQL guarantees.

**Launch decision: NO-GO.** This is an audit recommendation, not a production deployment action. The most consequential gaps are the customer/admin authentication model, BDT-only financial rules and COD advance flow, specified order/payment state machines, inventory reservation/ledger design, and permission/MFA controls.

### Requirements assessment

| Priority / topic | Initial status | Evidence and impact |
|---|---|---|
| P0 — API-only database boundary | **PARTIALLY IMPLEMENTED** | MySQL pool is created in `backend/database/pool.js` and injected into the API; no frontend source is present and `index.html` is empty. The architecture is consistent with an API-only database door in the inspected repository. |
| P0 — authenticated store context | **PARTIALLY IMPLEMENTED** | Store-scoped public API requests use `X-Store-Key` context in `backend/middleware/store-context.js`; cart/order queries and admin assignments are store-scoped (`backend/repositories/orders.repository.js`, `backend/middleware/store-context.js`). Store-admin order routes select `:storeId` from the URL and then check assignment rather than deriving store scope from `req.store` (`backend/routes/v1/admin-orders.routes.js`, `backend/middleware/store-context.js`), which does not meet §1's strict store-context invariant. Customer identity/account storage is global by email, contrary to the store-scoped phone identity in D5/§8.1 (`backend/migrations/004_create_customers.sql`, `backend/services/customer-auth.service.js`). |
| P0 — BDT integer money | **NOT IMPLEMENTED** | Amount columns use integer `*_minor` fields, but product/order/payment schemas accept any `CHAR(3)` currency and checkout supports one cart currency rather than enforcing BDT (`backend/migrations/006_create_products.sql`, `015_create_orders.sql`, `017_create_payments.sql`; `backend/services/orders.service.js`). No shared money library, basis-point pricing/tax engine, or specified rounding/discount allocation is present. |
| P0 — state machines and history | **PARTIALLY IMPLEMENTED** | `backend/services/orders.service.js` validates a limited order/payment transition map. Its state set differs from §6; no `order_status_history` or `payment_status_history` migration was found, and complete actor/reason history is absent. |
| P0 — external payment boundary and COD advance | **NOT IMPLEMENTED** | Payments are a single `payments` row with `pending/paid/failed/cancelled` and amount/currency (`backend/migrations/017_create_payments.sql`). No payment-provider adapter, advance submission/verification flow, webhook event store, provider reconciliation, or refund workflow appears in the tracked source inventory. |
| P0 — inventory integrity | **PARTIALLY IMPLEMENTED** | Checkout validates and decrements stock in a transaction; database inventory is product-level (`backend/services/orders.service.js`, `backend/migrations/008_create_inventory.sql`). The specified variant-level reservation records, expiry/release jobs, movement ledger, reconciliation, and concurrency evidence are absent. Database integration coverage was skipped. |
| P0 — customer authentication | **NOT IMPLEMENTED** | Current signup/login are email/password, with a globally unique email and store-bound access token; no phone account ID, email OTP challenge, guest checkout, refresh-token family, or account-session revocation is present (`backend/migrations/004_create_customers.sql`, `backend/services/customer-auth.service.js`, `backend/routes/v1/customer-auth.routes.js`). |
| P0 — admin MFA/session controls | **NOT IMPLEMENTED** | Admin routes expose password login and `me`; no MFA/TOTP, recovery codes, refresh-token/session registry, security version, or step-up confirmation was found (`backend/routes/v1/admin-auth.routes.js`, `backend/migrations/003_create_admin_users.sql`). |
| P0 — permission-based RBAC / approvals | **PARTIALLY IMPLEMENTED** | Store assignments and server-side role checks exist (`backend/middleware/require-roles.js`, `backend/middleware/store-context.js`). The schema has role names only; no permission mapping, custom permission checks, MFA step-up, maker-checker approvals, or “last super-admin” safeguard was found (`backend/migrations/002_create_roles.sql`). |
| P0 — CORS and unauthenticated request-cost controls | **PARTIALLY IMPLEMENTED** | Exact configured origins are checked, but store-scoped `OPTIONS` requests trigger an origin DB lookup before CORS middleware and before router rate limits (`backend/middleware/store-context.js`, `backend/app.js`, `backend/routes/v1/catalog.routes.js`). Production configuration also accepts HTTP origins (`backend/config/config.js`). |
| P0 — immutable audit trail | **PARTIALLY IMPLEMENTED** | `audit_logs` records action, entity, outcome, request ID, and timestamp; documentation prescribes `SELECT, INSERT` for the runtime account (`backend/migrations/009_create_audit_logs.sql`, `backend/README.md`). The schema does not include store scope, IP, user-agent, before/after hashes, or hash chaining. Actual production DB grants and tamper resistance were not checked. Its actor FK uses `ON DELETE SET NULL`, preserving the row but changing the actor reference. |
| P1 — pricing, tax, coupons | **NOT IMPLEMENTED** | No variant/store-price, tax-rate, coupon, or redemption schema/module is present in the tracked migrations or services. Checkout derives totals from current product prices in `backend/services/orders.service.js`; no configurable delivery charge or `tax_not_configured` response exists. |
| P1 — variants and per-store catalog | **PARTIALLY IMPLEMENTED** | Central products and per-store visibility mappings exist (`backend/migrations/006_create_products.sql`, `021_create_store_products.sql`). Variants, per-store prices/sale windows/SEO/categories/featured state, and per-store slug uniqueness are absent. Inventory and product SKU are product-level. |
| P1 — order identifiers and snapshots | **PARTIALLY IMPLEMENTED** | Orders snapshot customer/shipping/items and currency, but order numbers are generated as `SH-` plus random bytes rather than the specified store-code/date/sequence format (`backend/services/orders.service.js`). Tax, discount, delivery-fee, variant, and store-setting snapshots are absent. |
| P1 — returns, refunds, fulfillment, COD balance | **NOT IMPLEMENTED** | No route, service, repository, or migration for returns, refund approvals, shipments/couriers, COD balance, or delivery-advance refund rules was found. Existing order/payment statuses are smaller than §6 (`backend/migrations/015_create_orders.sql`, `017_create_payments.sql`). |
| P1 — risk and abuse controls | **NOT IMPLEMENTED** | No risk event/score/blocklist or per-store risk policy module/table was found. Existing endpoint/IP rate limiters are not a commerce risk engine. |
| P1 — notifications, jobs, outbox, webhooks | **NOT IMPLEMENTED** | No adapter/job/outbox/provider event modules or migrations are in the tracked inventory. No BullMQ/Redis dependency is declared (`backend/package.json`). No provider APIs are assumed by this audit. |
| P2 — modular architecture and adapters | **PARTIALLY IMPLEMENTED** | Routes/controllers/services/repositories are separated. Provider adapters and jobs are absent; service coverage is limited to auth, catalog, cart, orders, and stores (`backend/services/`). |
| P2 — API contract | **PARTIALLY IMPLEMENTED** | API routes are under `/api/v1/`; no OpenAPI document or contract-validation test/pipeline was found in the tracked inventory (`backend/routes/v1/`, `backend/test/`, `backend/package.json`). |
| P2 — multi-store model | **PARTIALLY IMPLEMENTED** | Stores, store credentials, store-admin assignment, product visibility, and store-scoped carts/orders exist (`backend/migrations/018_create_stores.sql` through `027_finalize_order_store_scope.sql`). The model lacks per-store pricing and the specification’s store-scoped customer identity. |
| P3 — resilience and timeouts | **PARTIALLY IMPLEMENTED** | The DB pool is bounded and uses a 10-second connect timeout; the server checks the DB before listening and handles SIGINT/SIGTERM (`backend/database/pool.js`, `backend/server.js`). Explicit HTTP request, query, and outbound-provider timeouts, retries, circuit breakers, and load-shedding behavior are not demonstrated. |
| P3 — caching | **PARTIALLY IMPLEMENTED** | Public catalog uses ETag revalidation and private endpoints are `private, no-store` (`backend/routes/v1/catalog.routes.js`, `backend/app.js`). Redis/shared caching, store-isolated cache-key abstraction, event-driven invalidation, and stale-while-revalidate are absent. Active hosting tier is unspecified. |
| P3 — observability | **PARTIALLY IMPLEMENTED** | Request logs are JSON with request ID, method, path, status, and duration (`backend/middleware/request-logger.js`). Metrics, traces, provider correlation, SLO dashboards/alerts, anomaly detection, and incident automation are absent. |
| P3 — CI/CD and release controls | **NOT IMPLEMENTED** | No tracked workflow/pipeline files were found. The package scripts include start, dev, test, migration, and admin bootstrap, but not lint, OpenAPI validation, SAST, secret/license scan, SBOM, build, DAST, or load gates (`backend/package.json`). |
| P3 — backup/DR | **PARTIALLY IMPLEMENTED** | Hosting-agnostic backup and restore steps exist in `docs/deployment.md`; no backup or restore exercise was performed and no configured production tier/RPO/RTO is evidenced. |
| P4 — storefront/admin UX | **NOT IMPLEMENTED** | `index.html` is empty and no storefront/admin frontend files are tracked. No existing UI was found to preserve. |
| P5 / tier-gated — HA, edge, external providers | **NOT VERIFIED / NOT IMPLEMENTED** | No hosting tier was supplied. The repository contains no evidence of deployed Redis, workers, object storage, CDN/WAF, replicas, multi-zone HA, or live provider contracts. Do not claim these capabilities exist. |

## 4. Verified findings requiring early attention

These are code-backed findings from this repository revision; they do not authorize implementation.

1. **P0 / HIGH — Store-scoped CORS preflights perform a database lookup before route limits.** `backend/middleware/store-context.js` handles `OPTIONS` by calling `storesRepository.listStoresForOrigin` before `cors` middleware runs in `backend/app.js`. Catalog rate limits are applied inside `backend/routes/v1/catalog.routes.js`, after that lookup. A local mock-pool check in the preceding audit observed two origin lookups for two unauthenticated preflight requests. This is an availability/resource-exhaustion risk.
2. **P0 / MEDIUM — Production accepts HTTP origins in `ALLOWED_ORIGINS`.** `backend/config/config.js` accepts both `http:` and `https:` without restricting production to HTTPS. A configuration probe using temporary in-memory values confirmed acceptance of an HTTP origin in production mode. This contradicts `docs/deployment.md`, which instructs production operators to use exact HTTPS origins.
3. **P2 / MEDIUM — Rate limiting behind a reverse proxy is deployment-sensitive.** `backend/app.js` sets `trust proxy` to `false`; limiters use the default in-process store. `backend/README.md` and `docs/deployment.md` caution about this, but the app has no configuration surface for narrowly trusted proxy hops or shared storage. Intended hosting topology is unknown.
4. **P1 / LOW — Numeric identifiers can exceed MySQL `BIGINT UNSIGNED`.** `backend/validators/stores.validators.js` checks up to 20 decimal digits but does not cap values at the database maximum; out-of-range IDs may reach SQL handling instead of failing validation.

## 5. Existing strengths

- SQL is kept in repository modules and uses parameterized `execute` calls; catalog sorting uses a fixed allow-list (`backend/repositories/`, `backend/services/catalog.service.js`).
- The API disables `X-Powered-By`, enables Helmet, bounds JSON bodies, and returns generic production server errors (`backend/app.js`, `backend/middleware/error-handler.js`).
- Store keys are hashed; customer JWTs use a distinct secret/audience and contain a signed store claim (`backend/middleware/store-context.js`, `backend/services/customer-auth.service.js`).
- Customer order/cart access is scoped to the authenticated customer and store, and store-admin assignment checks are server-side (`backend/repositories/orders.repository.js`, `backend/middleware/store-context.js`).
- Checkout uses a MySQL transaction, locks/revalidates checkout inputs, and has a unique store/customer idempotency key (`backend/services/orders.service.js`, `backend/migrations/027_finalize_order_store_scope.sql`).
- Migration execution uses an advisory lock and explicit approval for existing-row store backfills (`backend/scripts/migrate.js`).
- Order/payment enums and foreign keys restrict basic integrity; order/payment references use `ON DELETE RESTRICT` (`backend/migrations/015_create_orders.sql`, `016_create_order_items.sql`, `017_create_payments.sql`).
- `.gitignore` excludes `.env` while allowing only named example templates; actual `.env` content was not read (`.gitignore`).
- Tests cover health/readiness, some API isolation/authentication/input cases, cart arithmetic, and order service rollback behavior (`backend/test/`).

## 6. Test and evidence limitations

| Check | Result |
|---|---|
| `node --version` | `v24.21.0` |
| `npm --version` | `11.19.0` |
| `npm test` | 21 total; 20 passed; 0 failed; 1 skipped |
| Skipped case | MySQL integration test; no live DB behavior is established by this run |
| `npm audit` | 0 vulnerabilities reported at audit time |
| `npm ls --depth=0` | Completed; direct dependency tree listed |
| Initial Git status | `## main...origin/main`, clean |
| Secret handling | No `.env` contents or real credentials were read or printed |

NOT VERIFIED: live MySQL schema/grants, migration execution and idempotency, checkout locking under concurrency, provider contracts, backup/restore, deployment proxy/TLS configuration, active hosting tier, and any production environment behavior.

## 7. Required governance decisions before implementation

- Resolve the Master Specification’s header status (“DRAFT FOR OWNER REVIEW”) for future implementation reports. This audit uses the owner-supplied text as its assessment baseline only.
- Supply owner decisions/provider documentation for open business items before implementing them: customer account/OTP policy, advance/refund policy, bKash integration, tax rates and rules, return shipping, and deployment tier.
- The repository contains no `PROTECTED_FILES.md`; therefore no repository-defined protected-file list could be applied. Treat migrations, auth/session, payment/refund, secrets, deployment, and deletion paths as protected by the specification’s approval gates.
- No phase-specific implementation approval is recorded in this audit. Do not infer authorization for the proposed changes below.
