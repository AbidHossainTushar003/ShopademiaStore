const storesService = require('../services/stores.service');
const {
  validateAdminId,
  validateCreateStoreBody,
  validateProductId,
  validateStatusBody,
  validateStoreId,
  validateUpdateStoreBody,
  validateVisibilityBody,
} = require('../validators/stores.validators');

function notFound(response, entity = 'Store') {
  return response.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `${entity} was not found.` },
  });
}

function createAdminStoresController(pool) {
  return {
    async list(_request, response) {
      const stores = await storesService.listStores(pool);
      return response.status(200).json({ success: true, data: stores });
    },

    async get(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const store = await storesService.getStore(pool, storeId);
      return store ? response.status(200).json({ success: true, data: store }) : notFound(response);
    },

    async listAdmins(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const admins = await storesService.listStoreAdmins(pool, storeId);
      return response.status(200).json({ success: true, data: admins });
    },

    async create(request, response) {
      const input = validateCreateStoreBody(request.body);
      const result = await storesService.createStore(
        pool,
        request.admin,
        request.id,
        input,
      );
      return response.status(201).json({ success: true, data: result });
    },

    async update(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const input = validateUpdateStoreBody(request.body);
      const store = await storesService.updateStore(
        pool,
        request.admin,
        request.id,
        storeId,
        input,
      );
      return store ? response.status(200).json({ success: true, data: store }) : notFound(response);
    },

    async updateStatus(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const status = validateStatusBody(request.body);
      const store = await storesService.updateStoreStatus(
        pool,
        request.admin,
        request.id,
        storeId,
        status,
      );
      return store ? response.status(200).json({ success: true, data: store }) : notFound(response);
    },

    async rotateKey(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const result = await storesService.rotateStoreKey(
        pool,
        request.admin,
        request.id,
        storeId,
      );
      return result ? response.status(200).json({ success: true, data: result }) : notFound(response);
    },

    async revokeKey(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const store = await storesService.revokeStoreKey(
        pool,
        request.admin,
        request.id,
        storeId,
      );
      return store ? response.status(200).json({ success: true, data: store }) : notFound(response);
    },

    async assignAdmin(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const adminId = validateAdminId(request.params.adminId);
      const assignment = await storesService.assignStoreAdmin(
        pool,
        request.admin,
        request.id,
        storeId,
        adminId,
      );
      return assignment
        ? response.status(201).json({ success: true, data: assignment })
        : notFound(response);
    },

    async removeAdmin(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const adminId = validateAdminId(request.params.adminId);
      const removed = await storesService.removeStoreAdmin(
        pool,
        request.admin,
        request.id,
        storeId,
        adminId,
      );
      return removed === null
        ? notFound(response)
        : removed
          ? response.status(204).end()
          : notFound(response, 'Store administrator assignment');
    },

    async updateVisibility(request, response) {
      const storeId = validateStoreId(request.params.storeId);
      const productId = validateProductId(request.params.productId);
      const visibility = validateVisibilityBody(request.body);
      const result = await storesService.updateProductVisibility(
        pool,
        request.admin,
        request.id,
        storeId,
        productId,
        visibility,
      );
      return result
        ? response.status(200).json({ success: true, data: result })
        : notFound(response, 'Product');
    },
  };
}

module.exports = createAdminStoresController;
