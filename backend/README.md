# Shopademia API database setup

The API is the only component that connects to MySQL. Use MySQL 8 or later and create a dedicated application account; do not use `root`.

## Configure MySQL

Run these statements manually as a MySQL administrator, replacing both example passwords with unique strong passwords. These are setup instructions only; the application does not execute them.

```sql
CREATE DATABASE IF NOT EXISTS shopademia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'shopademia_app'@'localhost'
  IDENTIFIED BY 'replace_with_a_strong_application_password';
GRANT SELECT ON shopademia.* TO 'shopademia_app'@'localhost';

CREATE USER 'shopademia_migrator'@'localhost'
  IDENTIFIED BY 'replace_with_a_strong_migration_password';
GRANT SELECT, INSERT, CREATE, ALTER, INDEX, REFERENCES
  ON shopademia.* TO 'shopademia_migrator'@'localhost';
```

After applying migrations, grant the runtime account only the operations required by the API on the specific tables it uses. For the repositories in this phase, for example:

```sql
GRANT SELECT, INSERT, UPDATE ON shopademia.roles TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.admin_users TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.customers TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.categories TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.products TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.product_images TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.inventory TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT ON shopademia.audit_logs TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.carts TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON shopademia.cart_items TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.orders TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT ON shopademia.order_items TO 'shopademia_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON shopademia.payments TO 'shopademia_app'@'localhost';
```

If the API connects from a different host, replace `localhost` with the narrowest appropriate host restriction. Use the migration account only for schema migrations, and never use `root` from the application.

## Phase 3 schema

Administrator identities live in `admin_users` and are assigned an entry in `roles`; customer identities live in the separate `customers` table, which has no role relationship. Both tables store only password hashes. No accounts or roles are seeded. Products are centrally owned and are not duplicated for storefronts.

`products.price_minor` is an unsigned integer amount in the currency's minor unit (for example, cents); `currency_code` identifies the currency. This avoids floating-point money. The MySQL driver returns `BIGINT` values as strings to avoid JavaScript number precision loss. Product images store references only, not uploaded files. Audit rows contain action and entity identifiers but no arbitrary request payload or credential fields. Identity and catalog records are soft-deleted; audit records are append-only.

## Configure and start the API

Copy `.env.example` to `.env` in this directory and set the database host, database name, and both account passwords. Keep `.env` out of version control. Install dependencies with `npm install`, run pending migrations with `npm run migrate`, then start the API with `npm start`.

The migration runner takes a MySQL advisory lock, applies numbered SQL files in lexical order, and records each completed filename in `schema_migrations`. Each migration file must contain one SQL statement; add new migrations with the next unique numeric prefix. MySQL schema DDL can implicitly commit, so migrations should be reviewed and made safe to rerun where practical. There is no automatic rollback command; prefer reviewed forward migrations over destructive rollbacks.

`GET /api/v1/health` is a lightweight process health check. `GET /api/v1/health/ready` also checks MySQL and returns only a generic error if the database is unavailable.

## Public catalog reads

The public catalog exposes `GET /api/v1/storefront/home`, `GET /api/v1/products`, `GET /api/v1/products/:identifier` (numeric ID or slug), `GET /api/v1/categories`, and `GET /api/v1/categories/:id`. The home response contains up to eight active categories and eight recently added products. Product list filters include `q`, `category`, `minPrice`, and `maxPrice`; sort options are `newest`, `price_asc`, `price_desc`, `name_asc`, and `name_desc`. List endpoints default to page 1 and a bounded page size. Search uses an escaped name prefix, so `%`, `_`, and `!` are treated literally. Only active, non-deleted products and categories are public. Product responses include active images ordered by sort order and an `availability` value of `in_stock` or `out_of_stock`, derived from on-hand minus reserved inventory; exact stock quantities are not exposed. Public catalog routes are limited to 120 requests per minute per IP.

## Admin authentication

Set distinct random `ADMIN_JWT_SECRET` and `CUSTOMER_JWT_SECRET` values of at least 32 bytes in `.env`; generate them with a cryptographically secure random generator. Production refuses placeholder secrets. Admin access tokens are HS256 bearer tokens with the `shopademia-admin` audience and a configurable 5–30 minute lifetime. Admin roles and active status are loaded from MySQL for each protected request; role claims from tokens are not trusted. The customer secret/audience are reserved separately for Phase 7.

The login route is `POST /api/v1/admin/auth/login`; `GET /api/v1/admin/auth/me` requires an active `admin` or `super_admin` identity. Login attempts have an IP-wide limit and a stricter failed-attempt limit. The rate limiter uses its default in-process store, so limits reset on restart and are not shared across multiple server instances. Login success/failure audit records contain no passwords or tokens.

## Customer authentication and profile

Customers register with `POST /api/v1/auth/register` using `email`, `displayName`, and `password`, then sign in through `POST /api/v1/auth/login`. Emails are trimmed and lowercased, passwords use bcrypt cost 12 and the same 12–72 byte/common-password checks as administrator bootstrap, and duplicate emails return a generic 409 conflict. Registration is limited to 10 requests per IP every 15 minutes; login also has overall and failed-attempt limits. Customer access tokens use the separate `CUSTOMER_JWT_SECRET` and `shopademia-customer` audience; their lifetime is configured by `CUSTOMER_ACCESS_TOKEN_TTL_SECONDS` (defaults to the admin token lifetime when omitted).

`GET /api/v1/customers/me` and `PATCH /api/v1/customers/me` require a customer token. Profile updates allow only `displayName`; the customer ID is always taken from the verified token, and email/password changes are not supported in this phase. Profile responses omit password hashes and account-internal fields. Admin tokens are not accepted as customer tokens.

## Customer cart

Cart endpoints require a customer bearer token: `GET /api/v1/cart`, `POST /api/v1/cart/items` (`productId`, `quantity`), `PATCH /api/v1/cart/items/:itemId` (`quantity`), `DELETE /api/v1/cart/items/:itemId`, and `DELETE /api/v1/cart`. Cart ownership is derived from the verified customer token; cart/customer IDs and client prices/totals are not accepted. A cart holds at most 50 distinct products and 99 units per product. Adding or increasing a line requires an active product/category and sufficient unreserved inventory. Cart reads show current database prices and totals by currency, with flags for changed prices and unavailable or insufficient-stock items. A price snapshot is kept only to detect price changes; it is never used for totals.

## Checkout and orders

`POST /api/v1/checkout` requires a customer bearer token, a shipping JSON object (`recipientName`, `phone`, `addressLine1`, `city`, `region`, `postalCode`, `countryCode`, optional `addressLine2`), and an `Idempotency-Key` header of 16–128 safe characters. The API locks and revalidates the authenticated customer's cart, reloads current prices, verifies active products and available stock, and then creates an order with customer identity, shipping, and immutable item snapshots plus a pending payment record while decrementing inventory and clearing the cart in one transaction. Retrying with the same customer and key returns the original order. Mixed-currency carts are rejected because currency conversion is not part of this phase.

Customers can list and view only their own orders with `GET /api/v1/orders` and `GET /api/v1/orders/:orderId`. Admins with the `admin` or `super_admin` role can list/view orders under `/api/v1/admin/orders`, update order status with `PATCH /api/v1/admin/orders/:orderId/status`, and record payment status with `PATCH /api/v1/admin/orders/:orderId/payment-status`. Order transitions are pending→confirmed/cancelled, confirmed→processing/cancelled, processing→shipped/cancelled, and shipped→delivered. Payment transitions are pending→paid/failed and failed→pending; cancelling an unpaid order also marks its payment cancelled. Cancelling an unpaid order restores its inventory in the same transaction; paid orders cannot be cancelled via this API. Payment status is recorded without a payment gateway.

Admin catalog writes are under `/api/v1/admin/products` and `/api/v1/admin/categories`, including product status, inventory, and image operations. Every route in that admin catalog router requires an active admin token and a database-loaded `admin` or `super_admin` role. Writes use transactions and append audit records with request IDs and small before/after summaries. Duplicate unique values return 409. Categories are soft-deleted only when they have no products or child categories.

Development product images are accepted as JPEG, PNG, or WebP only after checking file signature, declared MIME type, and extension. Uploads are limited to five files of 5 MB each per request and 20 active images per product. The server generates UUID filenames and serves only the generated files from `/media/products/`; storage is under the ignored `backend/storage/product-images/` directory. This local filesystem storage is for development, not a multi-instance production deployment.

After applying the identity migrations, create the first administrator only in a non-production environment. Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` at runtime, then run `npm run admin:create`. The command ensures the explicit `super_admin` and `admin` role records exist and creates one `super_admin` account. Use a unique password of at least 12 bytes; the command refuses production and never prints the password. Remove the bootstrap variables from the environment after use.
