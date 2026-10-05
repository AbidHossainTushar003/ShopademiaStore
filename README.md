# ShopademiaStore
Production-ready multi-store e-commerce platform with centralized REST API, admin panel, MySQL database, and multiple storefront support.

## API caching

Catalog GET responses are private and use ETag revalidation; they vary by store credential and origin. Authenticated, admin, and other private API responses are marked `private, no-store`. There is no shared or application-level catalog cache.

## Testing and operations

Run the backend suite with `npm test` from `backend/`. Deployment, monitoring, backup, and recovery guidance is in [docs/deployment.md](./docs/deployment.md).
