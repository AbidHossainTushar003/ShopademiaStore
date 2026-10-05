# Deployment, operations, and recovery

This guide is hosting-agnostic. No production host or deployment environment has been specified. Do not copy example values into a live environment.

## Configuration and release

1. Install a supported Node.js version (20 or later) and install the locked dependencies with `npm ci` in `backend/`.
2. Supply the required values from [`backend/.env.production.example`](../backend/.env.production.example) through the host's secret/configuration manager. The example contains placeholders only. Keep `DB_USER` separate from the migration account and never use MySQL `root`.
3. Generate independent random values for `ADMIN_JWT_SECRET` and `CUSTOMER_JWT_SECRET`. Restrict `ALLOWED_ORIGINS` to exact HTTPS origins; do not use `*`.
4. Terminate HTTPS at a trusted reverse proxy or managed load balancer. Require TLS there and forward only validated host/protocol information. Express currently keeps `trust proxy` disabled; do not enable it for arbitrary client-supplied forwarding headers. If the deployment needs proxy-derived client addresses, configure trust for the exact trusted proxy hops/networks and verify rate limits before release.
5. Build/release from the reviewed source, then run `npm test`. Apply schema migrations as a separate deployment step using the dedicated migration account (`npm run migrate`); take and verify a backup first. Store-data backfills additionally require the explicit `STORE_DATA_BACKFILL_APPROVED=I_HAVE_VERIFIED_BACKUP` approval described by the migration runner.
6. Run `npm start` under the host's native service manager or a supervised Node.js process manager. Configure automatic restart on process failure, startup on host boot, bounded restart loops, and log forwarding. Do not run multiple migration processes concurrently.
7. On shutdown, allow the process to handle `SIGTERM`/`SIGINT` and close the HTTP listener and database pool cleanly.

## Automated tests and database isolation

Run `npm test` in `backend/`. Tests use an in-memory mock pool and do not connect to, mutate, or reset any database. The database-test configuration guard accepts only `NODE_ENV=test`, a `TEST_DB_NAME` ending in `_test`, and a name different from `DB_NAME`. Any future database integration tests must use dedicated test credentials and a disposable test schema; never point them at development or production data.

## Health checks and monitoring

- `GET /api/v1/health` is a database-independent liveness check. Restart only when this endpoint repeatedly fails.
- `GET /api/v1/health/ready` checks the database and returns 503 when the service cannot serve requests. Use it to gate traffic during startup and database outages.
- Monitor uptime, HTTP 5xx/429 rates, request latency, readiness failures, database connectivity/connection saturation, host disk and memory, migration outcomes, backup completion, and restore-test results.
- The application writes one-line JSON request events to stdout. Fields are request ID, method, path (without query string), status, duration, and an event category. It does not log request/response bodies, authorization headers, store keys, or query strings. 401/403/429 events are categorized as security rejections.
- Administrative changes and authentication outcomes are persisted in the `audit_logs` table with request IDs where available. Restrict access to application and database audit logs and define retention according to operational/legal needs.
- A basic uptime checker and the hosting platform's native metrics/log aggregation are sufficient to begin. No external monitoring vendor is required by this project.

## Backups

Choose a schedule and retention policy based on the business recovery objectives. A practical starting point is a daily encrypted full backup plus binary-log point-in-time recovery where the MySQL hosting plan supports it. Back up uploaded product images separately and keep database and image backup timestamps aligned. Restrict backup access and encrypt backups at rest and in transit.

Example full logical backup (replace placeholders using a protected shell/environment, not by committing credentials):

```sh
mysqldump --host="$DB_HOST" --user="$DB_BACKUP_USER" --single-transaction \
  --routines --triggers --events "$DB_NAME" > shopademia-YYYYMMDD.sql
```

Use a credential file or secret manager for the backup password; do not put passwords on command lines. Verify the command exit status, resulting file size, encryption, and off-host copy. Back up `backend/storage/product-images/` with an approved encrypted file-backup tool. Keep multiple retained generations and regularly test readability.

## Restore and recovery checklist

1. Declare the incident and stop or drain application writes if consistency requires it.
2. Select a known-good database backup and matching product-image backup. Preserve the damaged database and logs for investigation.
3. Create a separately named, isolated recovery/test schema through an authorized database operator, then restore the dump into it. Example (never point this at production during a restore test):

   ```sh
   mysql --host="$TEST_DB_HOST" --user="$TEST_DB_USER" \
     --database="$TEST_DB_NAME" < shopademia-YYYYMMDD.sql
   ```

   Restore the matching product-image backup into an isolated storage directory as well. Do not overwrite the production schema as an initial test.
4. Verify migration tracking, core row counts, constraints, representative orders/catalog data, and image references. Compare the restored data with the backup inventory and application expectations.
5. Validate the application against the isolated restore, including readiness, sign-in, catalog, carts/orders, and store isolation. Obtain an authorized operator's approval before any production restore or point-in-time recovery.
6. Restore production only through the hosting provider's documented procedure and approved change window. Confirm application health/readiness and monitor errors, database load, and backups after recovery.
7. Record recovery time, recovery point, data loss (if any), follow-up actions, and the date/result of the next restore exercise.
