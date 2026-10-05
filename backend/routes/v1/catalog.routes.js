const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const createCatalogController = require('../../controllers/catalog.controller');

function createCatalogRoutes(pool) {
  const router = express.Router();
  const controller = createCatalogController(pool);
  const publicReadLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_request, response) {
      return response.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many catalog requests. Try again later.',
        },
      });
    },
  });

  router.use(publicReadLimit);
  router.get('/storefront/home', controller.home);
  router.get('/products', controller.listProducts);
  router.get('/products/:identifier', controller.getProduct);
  router.get('/categories', controller.listCategories);
  router.get('/categories/:id', controller.getCategory);

  return router;
}

module.exports = createCatalogRoutes;
