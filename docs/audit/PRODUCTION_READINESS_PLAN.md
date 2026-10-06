# Production Readiness Plan

## Objective
Bring the project to a launch-ready state without weakening security, auth, inventory, or data-integrity controls.

## Priority order
1. P0: security, financial and inventory correctness, auth, approvals, store-scope integrity
2. P1: customer flows, order lifecycle, returns/refunds, shipping handling, deployment configuration
3. P2: UI coverage, accessibility, operational polish, performance
3. P3: future platform improvements

## Step 1 — Governance and decisions
- Maintain the phase-controlled governance model.
- Record open decisions in [docs/DECISIONS.md](c:/Users/Abidh/OneDrive/Desktop/Shopademia/docs/DECISIONS.md).
- Keep protected files and applied migrations restricted unless specifically approved.

## Step 2 — Safety and environment
- Keep all test work on the disposable test environments only.
- Reject all operations that would touch production or protected database names.
- Keep `.env` values local and never committed.

## Step 3 — Security foundations
- Review every auth and admin route against the Master Specification.
- Enforce least privilege and non-root MySQL accounts.
- Maintain audit logging and store-scoped authorization checks in all privileged actions.

## Step 4 — Financial and inventory correctness
- Enforce integer paisa and BDT-only calculations.
- Add reservation/release and ledger coverage for inventory changes.
- Validate stock and payment logic server-side without trusting client values.

## Step 5 — Order and payment lifecycle
- Switch to strict state-machine-driven transitions.
- Implement duplicate payment detection and admin verification for manual bKash and COD approvals.
- Require server-side audit records and consistent refund logic.

## Step 6 — Frontend
- Build real storefront and admin pages using plain HTML/CSS/JS.
- Keep all UI data sourced from the API.
- Preserve a responsive design and accessible contrast.

## Step 7 — Deployment readiness
- Document cPanel deployment steps in [docs/DEPLOYMENT_CPANEL.md](c:/Users/Abidh/OneDrive/Desktop/Shopademia/docs/DEPLOYMENT_CPANEL.md).
- Verify health endpoint, env setup, proxy trust, and origin restrictions.
- Do not deploy during this task.

## Step 8 — Self-audit and loop
- Re-run the targeted and full test suites.
- Recheck security and database safety rules.
- Fix only the precise defects discovered and reverify.
