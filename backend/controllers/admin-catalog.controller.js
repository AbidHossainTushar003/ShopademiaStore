const adminCatalogService = require('../services/admin-catalog.service');
const {
  validateAdminListQuery,
  validateCategoryBody,
  validateCategoryStatusBody,
  validateId,
  validateImageUpdateBody,
  validateInventoryAdjustmentBody,
  validateProductBody,
  validateProductStatusBody,
} = require('../validators/admin-catalog.validators');

function notFound(response, entity) {
  return response.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `${entity} was not found.` },
  });
}

function createAdminCatalogController(pool) {
  return {
    async listProducts(request, response) {
      const query = validateAdminListQuery(request.query);
      const result = await adminCatalogService.listProducts(pool, query);
      return response.status(200).json({ success: true, ...result });
    },

    async getProduct(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const product = await adminCatalogService.getProduct(pool, productId);
      return product
        ? response.status(200).json({ success: true, data: product })
        : notFound(response, 'Product');
    },

    async createProduct(request, response) {
      const product = validateProductBody(request.body);
      const created = await adminCatalogService.createProduct(
        pool,
        request.admin,
        request.id,
        product,
      );
      return response.status(201).json({ success: true, data: created });
    },

    async updateProduct(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const product = validateProductBody(request.body);
      const updated = await adminCatalogService.updateProduct(
        pool,
        request.admin,
        request.id,
        productId,
        product,
      );
      return updated
        ? response.status(200).json({ success: true, data: updated })
        : notFound(response, 'Product');
    },

    async updateProductStatus(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const status = validateProductStatusBody(request.body);
      const updated = await adminCatalogService.updateProductStatus(
        pool,
        request.admin,
        request.id,
        productId,
        status,
      );
      return updated
        ? response.status(200).json({ success: true, data: updated })
        : notFound(response, 'Product');
    },

    async listCategories(request, response) {
      const query = validateAdminListQuery(request.query);
      const result = await adminCatalogService.listCategories(pool, query);
      return response.status(200).json({ success: true, ...result });
    },

    async getCategory(request, response) {
      const categoryId = validateId(request.params.categoryId, 'categoryId');
      const category = await adminCatalogService.getCategory(pool, categoryId);
      return category
        ? response.status(200).json({ success: true, data: category })
        : notFound(response, 'Category');
    },

    async createCategory(request, response) {
      const category = validateCategoryBody(request.body);
      const created = await adminCatalogService.createCategory(
        pool,
        request.admin,
        request.id,
        category,
      );
      return response.status(201).json({ success: true, data: created });
    },

    async updateCategory(request, response) {
      const categoryId = validateId(request.params.categoryId, 'categoryId');
      const category = validateCategoryBody(request.body, { includeStatus: false });
      const updated = await adminCatalogService.updateCategory(
        pool,
        request.admin,
        request.id,
        categoryId,
        category,
      );
      return updated
        ? response.status(200).json({ success: true, data: updated })
        : notFound(response, 'Category');
    },

    async updateCategoryStatus(request, response) {
      const categoryId = validateId(request.params.categoryId, 'categoryId');
      const status = validateCategoryStatusBody(request.body);
      const updated = await adminCatalogService.updateCategoryStatus(
        pool,
        request.admin,
        request.id,
        categoryId,
        status,
      );
      return updated
        ? response.status(200).json({ success: true, data: updated })
        : notFound(response, 'Category');
    },

    async deleteCategory(request, response) {
      const categoryId = validateId(request.params.categoryId, 'categoryId');
      const deleted = await adminCatalogService.deleteCategory(
        pool,
        request.admin,
        request.id,
        categoryId,
      );
      return deleted
        ? response.status(200).json({ success: true, data: deleted })
        : notFound(response, 'Category');
    },

    async setInventory(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const adjustment = validateInventoryAdjustmentBody(request.body, { absolute: true });
      const inventory = await adminCatalogService.changeInventory(
        pool,
        request.admin,
        request.id,
        productId,
        adjustment,
      );
      return inventory
        ? response.status(200).json({ success: true, data: inventory })
        : notFound(response, 'Product');
    },

    async adjustInventory(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const adjustment = validateInventoryAdjustmentBody(request.body);
      const inventory = await adminCatalogService.changeInventory(
        pool,
        request.admin,
        request.id,
        productId,
        adjustment,
      );
      return inventory
        ? response.status(200).json({ success: true, data: inventory })
        : notFound(response, 'Product');
    },

    async uploadImages(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const images = await adminCatalogService.uploadImages(
        pool,
        request.admin,
        request.id,
        productId,
        request.files,
      );
      return images
        ? response.status(201).json({ success: true, data: images })
        : notFound(response, 'Product');
    },

    async updateImage(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const imageId = validateId(request.params.imageId, 'imageId');
      const input = validateImageUpdateBody(request.body);
      const image = await adminCatalogService.updateImage(
        pool,
        request.admin,
        request.id,
        productId,
        imageId,
        input,
      );
      return image
        ? response.status(200).json({ success: true, data: image })
        : notFound(response, 'Product image');
    },

    async removeImage(request, response) {
      const productId = validateId(request.params.productId, 'productId');
      const imageId = validateId(request.params.imageId, 'imageId');
      const removed = await adminCatalogService.removeImage(
        pool,
        request.admin,
        request.id,
        productId,
        imageId,
      );
      return removed
        ? response.status(200).json({ success: true, data: { removed: true } })
        : notFound(response, 'Product image');
    },
  };
}

module.exports = createAdminCatalogController;
