const express = require('express');
const createAdminAuthentication = require('../../middleware/admin-authentication');
const uploadProductImages = require('../../middleware/product-image-upload');
const requireRoles = require('../../middleware/require-roles');
const createAdminCatalogController = require('../../controllers/admin-catalog.controller');

function createAdminCatalogRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createAdminCatalogController(pool);

  router.use(
    createAdminAuthentication(pool, authConfig),
    requireRoles('super_admin'),
  );

  router.get('/products', controller.listProducts);
  router.post('/products', controller.createProduct);
  router.get('/products/:productId', controller.getProduct);
  router.put('/products/:productId', controller.updateProduct);
  router.patch('/products/:productId/status', controller.updateProductStatus);
  router.put('/products/:productId/inventory', controller.setInventory);
  router.patch('/products/:productId/inventory', controller.adjustInventory);
  router.post('/products/:productId/images', uploadProductImages, controller.uploadImages);
  router.patch('/products/:productId/images/:imageId', controller.updateImage);
  router.delete('/products/:productId/images/:imageId', controller.removeImage);

  router.get('/categories', controller.listCategories);
  router.post('/categories', controller.createCategory);
  router.get('/categories/:categoryId', controller.getCategory);
  router.put('/categories/:categoryId', controller.updateCategory);
  router.patch('/categories/:categoryId/status', controller.updateCategoryStatus);
  router.delete('/categories/:categoryId', controller.deleteCategory);

  return router;
}

module.exports = createAdminCatalogRoutes;
