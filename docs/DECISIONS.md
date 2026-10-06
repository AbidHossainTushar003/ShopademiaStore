# Production Readiness Decisions

## Decision 1 — Production Readiness initiative name
The owner approved the initiative as `Shopademia Production Readiness` and explicitly forbade using the name `Phase S`.

## Decision 2 — Phase gate
The repository governance continues to require phase-controlled delivery. No new work starts without an owner-approved scope. The current approved scope is the Production Readiness initiative.

## Decision 3 — Migration checksum enforcement
Migration checksums are approved for implementation. The migration runner now stores an SHA-256 checksum for each applied migration and refuses to continue when a previously applied migration file has changed.

## Decision 4 — Test database safety
Only disposable test databases may be used: `shopademia_test` and `shopademia_restore_test`. The protected `shopademia_phase_r_test` database remains out of scope unless specifically approved.

## Decision 5 — Secret handling
No secrets are committed or printed. Configuration values remain in local environment files that are not committed to the repository.

## Decision 6 — cPanel target assumptions
The deployment target is cPanel with the user `shopadem` and the domains `shopademia.store`, `api.shopademia.store`, and `admin.shopademia.store`. This is a deployment design note only; no live deployment is performed in this task.

## Decision 7 — Frontend implementation model
The storefront and admin UI are implemented as plain HTML/CSS/JavaScript, using the existing API routes and the approved orange/blue brand token set. No front-end framework is introduced.

## Decision 8 — Ambiguity policy
When a product requirement is ambiguous, the safer, more restrictive option is selected and recorded here. This keeps the system within the specification and prevents hidden weakening of authorization or financial controls.
