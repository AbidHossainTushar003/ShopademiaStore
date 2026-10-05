const { createHash } = require('node:crypto');
const storesRepository = require('../repositories/stores.repository');
const { validateStoreId } = require('../validators/stores.validators');

const storeScopedPath = /^\/(?:api\/v1\/(?:storefront(?:\/|$)|products(?:\/|$)|categories(?:\/|$)|auth(?:\/|$)|customers(?:\/|$)|cart(?:\/|$)|checkout(?:\/|$)|orders(?:\/|$))|media\/products(?:\/|$))/;

function unauthorized(response) {
  return response.status(401).json({
    success: false,
    error: { code: 'STORE_AUTHENTICATION_REQUIRED', message: 'A valid store credential is required.' },
  });
}

function createStoreContext(pool) {
  return async (request, response, next) => {
    if (!storeScopedPath.test(request.path)) {
      return next();
    }

    request.storeScopedRequest = true;
    response.vary('X-Store-Key');
    try {
      const origin = request.get('origin');
      if (request.method === 'OPTIONS') {
        request.storeOriginAllowed = origin
          ? (await storesRepository.listStoresForOrigin(pool, origin)).length > 0
          : false;
        return next();
      }

      const key = request.get('x-store-key');
      if (
        typeof key !== 'string' ||
        key.length > 128 ||
        !/^sk_[A-Za-z0-9_-]{43}$/.test(key)
      ) {
        return unauthorized(response);
      }

      const credentialHash = createHash('sha256').update(key, 'utf8').digest('hex');
      const store = await storesRepository.getActiveStoreByCredentialHash(pool, credentialHash);
      if (!store) {
        return unauthorized(response);
      }
      const { credential_hash: _credentialHash, ...safeStore } = store;
      request.store = safeStore;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function authorizeStoreRequest(pool) {
  return async (request, response, next) => {
    try {
      const storeId = validateStoreId(request.params.storeId);
      const store = await storesRepository.getStoreById(pool, storeId);
      if (!store) {
        return response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Store was not found.' },
        });
      }
      if (
        request.admin.role !== 'super_admin' &&
        !(await storesRepository.hasStoreAdmin(pool, storeId, request.admin.id))
      ) {
        return response.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'The administrator is not assigned to this store.' },
        });
      }
      response.setHeader('Cache-Control', 'private, no-store');
      const { credential_hash: _credentialHash, ...safeStore } = store;
      request.store = safeStore;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function authorizeStoreImage(pool) {
  return async (request, response, next) => {
    if (
      !request.path.startsWith('/media/products/') ||
      !['GET', 'HEAD'].includes(request.method)
    ) {
      return next();
    }
    try {
      if (request.store.allowed_origins.includes(request.get('origin'))) {
        response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
      response.setHeader('Cache-Control', 'private, no-store');
      const [rows] = await pool.execute(
        `SELECT 1
         FROM product_images pi
         INNER JOIN products p ON p.product_id = pi.product_id
         INNER JOIN categories c ON c.category_id = p.category_id
         INNER JOIN store_products sp
           ON sp.product_id = p.product_id
          AND sp.store_id = ?
          AND sp.visibility = 'visible'
         WHERE pi.image_url = ?
           AND pi.status = 'active'
           AND pi.deleted_at IS NULL
           AND p.status = 'active'
           AND p.deleted_at IS NULL
           AND c.status = 'active'
           AND c.deleted_at IS NULL
         LIMIT 1`,
        [request.store.store_id, request.path],
      );
      if (rows.length === 0) {
        return response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Product image was not found.' },
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { authorizeStoreImage, authorizeStoreRequest, createStoreContext };
