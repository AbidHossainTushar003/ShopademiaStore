# cPanel Deployment Guide (Shopademia)

## Scope
This document captures the cPanel deployment design for the Shopademia API and admin/storefront interfaces. It is a deployment plan only and not a live deployment.

## Target topology
- Primary application user: `shopadem`
- Main domain: `shopademia.store`
- API subdomain: `api.shopademia.store`
- Admin subdomain: `admin.shopademia.store`
- Runtime: Node.js + Express + MySQL
- Security boundary: all MySQL access happens through the API only

## Recommended structure
- `/home/shopadem/public_html/` for static storefront files
- `/home/shopadem/api/` for the Node.js API runtime
- `/home/shopadem/admin/` for the admin UI
- `/home/shopadem/shared/` for `.env` and local configuration outside the web root
- `/home/shopadem/storage/` for local product image storage if needed in staging

## Node.js runtime
- Use a supported Node.js version (>=20) matching the project engine.
- Run the API via a Node process manager or a dedicated startup script.
- Ensure the startup command reads environment variables from a non-public location.
- Keep `NODE_ENV=production` outside local development.

## Environment variables
Set the live environment variables in a non-web-accessible location. Required values include:
- `PORT`
- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_POOL_SIZE`
- `DB_MIGRATION_USER`
- `DB_MIGRATION_PASSWORD`
- `ADMIN_JWT_SECRET`
- `CUSTOMER_JWT_SECRET`
- `ADMIN_ACCESS_TOKEN_TTL_SECONDS`
- `CUSTOMER_ACCESS_TOKEN_TTL_SECONDS`
- `TRUST_PROXY`

Do not commit `.env` files or expose values in logs or repository files.

## Reverse proxy and TLS
- Terminate TLS in cPanel or a front-end proxy.
- Restrict `ALLOWED_ORIGINS` to the exact HTTPS origins for the API, storefront, and admin.
- Keep `trust proxy` explicit and narrow; do not use wildcard proxy trust.
- Ensure the API never trusts client-supplied `X-Forwarded-For` without explicit proxy validation.

## Security defaults
- Disable `x-powered-by`.
- Use strict CORS with explicit origins.
- Keep uploads storage under a non-public directory.
- Do not expose stack traces in production responses.
- Validate all external input, especially payment, authorization, and store-scoped identifiers.

## MySQL safety
- Use a dedicated non-root application account and separate migration account.
- Restrict privileges to the required database and tables only.
- Never use production data for local or test work.
- Apply migrations only in approved disposable test environments until production readiness is confirmed.

## Backup and restore
- Keep database backups outside the repository.
- Validate backup/restore on disposable test schemas before production use.
- Ensure the migration runner guard remains active for sensitive backfills and data-changing migrations.

## Post-deploy checks
- `GET /api/v1/health` returns HTTP 200.
- API and admin URLs resolve with valid TLS.
- CORS allows only configured origins.
- Rate limiting and request size limits remain active.
- Logs are reviewed for security and operational anomalies.

## Known limitation
This is a design and readiness document only. It does not permit live deployment without explicit live-environment verification and owner sign-off.
