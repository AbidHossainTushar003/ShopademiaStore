const catalogService = require('../services/catalog.service');
const {
  validateCategoryId,
  validateCategoryListQuery,
  validateProductIdentifier,
  validateProductListQuery,
} = require('../validators/catalog.validators');

function createCatalogController(pool) {
  return {
    async home(request, response) {
      const data = await catalogService.getStorefrontHome(pool, request.store.store_id);
      return response.status(200).json({ success: true, data });
    },

    async listProducts(request, response) {
      const query = validateProductListQuery(request.query);
      const result = await catalogService.listProducts(pool, request.store.store_id, query);
      return response.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    },

    async getProduct(request, response) {
      const identifier = validateProductIdentifier(request.params.identifier);
      const product = await catalogService.getProduct(pool, request.store.store_id, identifier);

      if (!product) {
        return response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Product was not found.' },
        });
      }

      return response.status(200).json({ success: true, data: product });
    },

    async listCategories(request, response) {
      const query = validateCategoryListQuery(request.query);
      const result = await catalogService.listCategories(pool, request.store.store_id, query);
      return response.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    },

    async getCategory(request, response) {
      const categoryId = validateCategoryId(request.params.id);
      const category = await catalogService.getCategory(
        pool,
        request.store.store_id,
        categoryId,
      );

      if (!category) {
        return response.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Category was not found.' },
        });
      }

      return response.status(200).json({ success: true, data: category });
    },
  };
}

module.exports = createCatalogController;
