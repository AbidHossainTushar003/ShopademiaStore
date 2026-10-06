# Protected Files and Areas

Changes to the files or areas below require explicit owner approval before editing. General approval to work on a phase does not authorize crossing the specification's specific migration, authentication/session, payment/refund, secrets, production, or data-deletion gates.

## Applied migrations — do not edit

- `backend/migrations/001_create_schema_migrations.sql`
- `backend/migrations/002_create_roles.sql`
- `backend/migrations/003_create_admin_users.sql`
- `backend/migrations/004_create_customers.sql`
- `backend/migrations/005_create_categories.sql`
- `backend/migrations/006_create_products.sql`
- `backend/migrations/007_create_product_images.sql`
- `backend/migrations/008_create_inventory.sql`
- `backend/migrations/009_create_audit_logs.sql`
- `backend/migrations/010_add_catalog_read_indexes.sql`
- `backend/migrations/011_add_category_read_index.sql`
- `backend/migrations/012_add_audit_summaries.sql`
- `backend/migrations/013_create_carts.sql`
- `backend/migrations/014_create_cart_items.sql`
- `backend/migrations/015_create_orders.sql`
- `backend/migrations/016_create_order_items.sql`
- `backend/migrations/017_create_payments.sql`
- `backend/migrations/018_create_stores.sql`
- `backend/migrations/019_seed_default_store.sql`
- `backend/migrations/020_create_store_admins.sql`
- `backend/migrations/021_create_store_products.sql`
- `backend/migrations/022_add_store_to_carts.sql`
- `backend/migrations/023_backfill_existing_carts.sql`
- `backend/migrations/024_finalize_cart_store_scope.sql`
- `backend/migrations/025_add_store_to_orders.sql`
- `backend/migrations/026_backfill_existing_orders.sql`
- `backend/migrations/027_finalize_order_store_scope.sql`
- `backend/migrations/028_backfill_products_for_default_store.sql`

## Security-sensitive files and paths

- `backend/middleware/store-context.js`
- `backend/middleware/admin-authentication.js`
- `backend/middleware/customer-authentication.js`
- `backend/config/config.js`
- `.env*` and `backend/.env*` (never read, print, copy, or alter real environment files without explicit authorization)
- Any future migration, authentication/session, payment/refund, secrets, production deployment, or destructive data operation

This list records protected areas; it does not grant approval to modify them.
