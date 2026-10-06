# ShopademiaStore Agent Operating Rules

## Authority and priority

- Read `docs/MASTER_SPECIFICATION.md` and `PROTECTED_FILES.md` before work. The Master Specification is authoritative; stop and ask if unavailable or ambiguous.
- Priority is P0 security, legal, financial, and data integrity; then P1 business invariants; P2 API/architecture; P3 reliability/performance; P4 UX; P5 future work. Lower priorities never override higher ones.
- Implement only the phase explicitly approved by the owner. Finish its phase audit report and stop.
- Preserve working behavior and UI. Audit first; make the smallest verified change. Do not invent business rules, tax rates, provider APIs or fields, credentials, or evidence.
- Proprietary software: do not redistribute project or specification content. Preserve third-party dependency licenses.

## Non-negotiable invariants

- The API is the only database door. Store scope comes from authenticated `req.store`, not client-supplied IDs.
- Currency is BDT and money is integer paisa; do not use floating-point currency arithmetic.
- All entity status changes go through the relevant state machine.
- External payment/courier calls stay outside database transactions; use idempotency, reservations, webhooks/reconciliation, and compensating actions as specified.
- Never hard-delete orders, payments, refunds, inventory movements, or audit records, and never cascade their deletion.
- Validate third-party responses and all external input. Use parameterized SQL in repositories only.
- Do not store card authentication data. Never expose secrets in source, logs, responses, or browser code.
- Authorization is deny-by-default and checks action, object ownership, and store scope server-side. Audit privileged actions; audit records are append-only.
- Do not claim unavailable hosting capabilities or compliance certifications.

## Required workflow and approval gates

1. Read the specification and protected-file list, inspect the repository and current Git state, and run the relevant baseline tests before edits.
2. Produce a change-impact analysis before code changes: files, tables/indexes, endpoints, state machines, security invariants, data/backfill, compatibility, rollback/forward-fix, and tests.
3. Stop for explicit owner approval before writing/running migrations, changing authentication/sessions, payment/refund logic, secrets, production deployment, or deleting data. Show proposed SQL/backfill before migration approval.
4. Stop on spec conflicts, missing business/provider rules, repository state inconsistent with the audit, or failing P0 tests.
5. Keep migrations forward-only; never modify already-applied migrations. Use distinct least-privilege runtime and migration accounts. Never use production data for tests.
6. Match the modular-monolith layers: routes, validators, controllers, services, repositories, adapters, jobs. Keep SQL in repositories and parameterized.
7. Test the exact change, perform security/self-review, document exact commands and outcomes, list changed files/data/API effects and limitations, then write the phase audit report and stop.

## Reporting

Every claim requires file/line, command output, or test evidence. Mark unverifiable items `NOT VERIFIED: [reason]`. Do not claim tests passed unless run. Do not claim PCI compliance or similar.
