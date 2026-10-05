# ShopademiaStore
Production-ready multi-store e-commerce platform with centralized REST API, admin panel, MySQL database, and multiple storefront support.

## API caching

Catalog GET responses are private and use ETag revalidation; they vary by store credential and origin. Authenticated, admin, and other private API responses are marked `private, no-store`. There is no shared or application-level catalog cache.
