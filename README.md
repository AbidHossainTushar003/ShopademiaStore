# ShopademiaStore
Multi-store e-commerce platform under development. The current repository contains a centralized Node.js/Express API backed by MySQL; storefront and admin frontend applications are not present yet.

## Project governance and API contract

- [Master Specification](docs/MASTER_SPECIFICATION.md) is the authoritative requirements document.
- [Agent operating rules](CLAUDE.md) and [protected files](PROTECTED_FILES.md) define repository workflow and approval gates.
- [OpenAPI contract](docs/openapi.yaml) inventories the API routes currently implemented.

## API caching

Catalog GET responses are private and use ETag revalidation; they vary by store credential and origin. Authenticated, admin, and other private API responses are marked `private, no-store`. There is no shared or application-level catalog cache.

## Testing and operations

Run the backend suite with `npm test` from `backend/`. Deployment, monitoring, backup, and recovery guidance is in [docs/deployment.md](./docs/deployment.md).
