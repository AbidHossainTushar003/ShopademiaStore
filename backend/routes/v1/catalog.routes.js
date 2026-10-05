const express = require('express');
const createCatalogController = require('../../controllers/catalog.controller');

function createCatalogRoutes(pool) {
  const router = express.Router();
  const controller = createCatalogController(pool);

  router.get('/products', controller.listProducts);
  router.get('/products/:identifier', controller.getProduct);
  router.get('/categories', controller.listCategories);
  router.get('/categories/:id', controller.getCategory);

  return router;
}

module.exports = createCatalogRoutes;
