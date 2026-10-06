# Phase A Audit Report — Hygiene and Governance

**Phase:** A — Hygiene and governance  
**Date:** 2026-10-06  
**Approval:** Owner confirmed the Section 3 corrections and approved Phase A using the supplied Master Specification attachment.  
**Outcome:** Phase A documentation/governance work completed. Runtime code and database were not changed in this phase.

## 1. Scope

- Add LF/binary-file attributes.
- Add repository agent rules and a protected-file list.
- Copy the owner-supplied Master Specification and link it from the root README.
- Add an OpenAPI inventory of the routes currently wired in the API and media handler.
- Decide how to satisfy the route/OpenAPI coverage-test requirement without violating the docs/config-only scope.

## 2. Files changed

### Created

- `.gitattributes`
- `CLAUDE.md`
- `PROTECTED_FILES.md`
- `docs/MASTER_SPECIFICATION.md`
- `docs/adr/ADR-000-template.md`
- `docs/openapi.yaml`
- `docs/audit/PHASE_A_AUDIT_REPORT.md`

### Modified

- `README.md`

The worktree also contains uncommitted changes from the previously approved Phase 1 work. They were not modified or staged as part of Phase A. Git status evidence is recorded below.

## 3. Tables changed

None. No database connection or migration was run.

## 4. APIs changed

None. `docs/openapi.yaml` documents existing endpoints only. It does not alter runtime routes or response behavior.

The OpenAPI inventory covers the 52 explicit router declarations found in `backend/routes/v1/*.js`, plus the static product-media `GET` and Express-served `HEAD` operations. Middleware-generated CORS `OPTIONS` behavior is noted but is not an explicit router declaration.

## 5. Master Specification §1 invariant review

| # | Invariant | Phase A result | Evidence |
|---|---|---|---|
| 1 | API is the only database door. | NOT TOUCHED | No runtime/database code changed. |
| 2 | Store ID comes from authenticated `req.store`. | NOT TOUCHED | No runtime/database code changed. |
| 3 | Money is integer minor units, BDT only. | NOT TOUCHED | No money implementation changed. |
| 4 | State changes use state machines. | NOT TOUCHED | No state-changing code changed. |
| 5 | External payment/courier effects stay outside DB transactions. | NOT TOUCHED | No provider or transaction code changed. |
| 6 | Orders, payments, refunds, inventory movements, and audit logs are not hard-deleted or cascaded. | NOT TOUCHED | No schema or delete implementation changed. |
| 7 | Third-party responses are untrusted and validated. | NOT TOUCHED | No provider integration changed. |
| 8 | No card authentication data is stored. | NOT TOUCHED | No payment code or data changed. |
| 9 | Secrets are not exposed. | PASS FOR PHASE SCOPE | Only owner-supplied documentation was copied; no `.env` content was read or printed. No runtime/API/browser content changed. |
| 10 | Authorization is deny-by-default and store-scoped. | NOT TOUCHED | No authorization code changed. |
| 11 | Privileged actions are audited; audit records are append-only. | NOT TOUCHED | Documentation records current controls and gaps; no audit implementation changed. |
| 12 | Do not fabricate requirements, provider details, or evidence. | PASS FOR DOCUMENTED SCOPE | OpenAPI body field schemas are explicitly left unspecified where not transcribed; route paths/methods were checked against existing route declarations. See validation limitations. |
| 13 | Only the approved phase is implemented, then stop. | PASS | Only Phase A documentation/configuration work was performed; no Phase B work was started. |
| 14 | Proprietary software and third-party licenses remain respected. | PASS FOR PHASE SCOPE | The supplied proprietary specification was copied only into this private project workspace; no third-party dependency or license was changed. |

## 6. Tests and checks

### Baseline before Phase A changes

Command: `npm.cmd test` from `backend/`  
Result: **26 tests; 25 passed; 0 failed; 1 skipped**.

The skipped test is `MySQL integration: constraints, checkout atomicity, stock locking, customer/store isolation`.

Command: check for `backend/.env.test` and `backend/.env.test.example` existence (without reading real environment contents).  
Result: `.env.test` absent; `.env.test.example` present. `npm run test:db` was not run because there is no configured test environment. The integration workflow also requires explicit reset approval and can drop/recreate the two explicitly named test schemas; Phase A made no database changes.

### After Phase A changes

Command: `npm.cmd test` from `backend/`  
Result: **26 tests; 25 passed; 0 failed; 1 skipped**. This exactly matches the pre-Phase-A baseline counts.

Editor diagnostics reported no errors for `docs/openapi.yaml`, `CLAUDE.md`, `PROTECTED_FILES.md`, `docs/adr/ADR-000-template.md`, or this phase report. `git diff --check` reported no whitespace errors; Git emitted line-ending warnings for CRLF working copies under the new `.gitattributes`.

### Route/OpenAPI coverage

- All files under `backend/routes/v1/` were read.
- A source search found **52** explicit `router.get/post/put/patch/delete` declarations.
- A read-only count compared **52** explicit router declarations with **54** OpenAPI operations; the additional two are static media `GET` and `HEAD`.
- The copied `docs/MASTER_SPECIFICATION.md` was SHA-256 checked against the supplied attachment; the check returned `ExactCopy=True`.
- The OpenAPI file was manually inventoried against the route files; count parity does not prove path/method parity.
- An automated test that fails when route declarations are missing from OpenAPI was deferred. The approved Phase A completion constraint says only documentation/configuration files are to change; adding a backend test would exceed that constraint. No YAML parser/OpenAPI validator is installed in the inspected dependency set, and no dependency was added.

NOT VERIFIED: Formal YAML/OpenAPI schema validation and machine-checked route-to-OpenAPI parity; no validator was available without adding tooling. The route inventory was manually compared, not proven by an automated contract test.

## 7. Line-ending normalization

`.gitattributes` now declares `* text=auto eol=lf` and binary handling for common image/font formats.

Before adding it, `git ls-files --eol` showed tracked text files stored as LF in the index and CRLF in the working tree; `core.autocrlf` is enabled. The post-add check still reports working-tree CRLF and Git warns these files will be replaced by LF the next time Git touches them. Therefore, a repository-wide normalization commit was **not** created or staged: Phase 1 changes remain uncommitted, and combining or staging broad line-ending changes with them would violate the separate-commit requirement. Proposed follow-up commit title, after the current Phase 1 work is separately settled: `chore: normalize repository line endings`.

No files were staged and no commits were made.

## 8. Breaking changes

None. Runtime code and API behavior were not changed in Phase A.

## 9. Open questions / owner decisions

- Phase B customer store scoping changes authentication and requires migration approval. Before any implementation, inspect every customer query, produce the complete migration impact analysis and SQL/backfill plan, then stop for explicit approval.
- Phase C per-store pricing precedence and sale-window rules need to be reconciled with the Master Specification’s §7.1 before implementation; a migration requires approval.
- The supplied Master Specification remains marked “DRAFT FOR OWNER REVIEW.” This phase copies it verbatim and does not change its status or resolve OWNER-REVIEW decisions.

## 10. What was not done

- No migrations were written or run; no database was accessed.
- No authentication/session, payment/refund, production, secrets, or destructive data changes were made.
- No endpoint or OpenAPI automated coverage test was added.
- No packages were installed or changed.
- No line-ending normalization was staged or committed.
- No Phase B or later work was started.

## 11. Proposed next phase

Phase B — Customer store scoping (F1), only after a separate explicit approval for the migration and authentication changes. Do not start automatically.

## 12. Stop condition

Phase A scope is complete. Stop here and await explicit approval before Phase B.

**PHASE A COMPLETE — AWAITING OWNER APPROVAL.**
