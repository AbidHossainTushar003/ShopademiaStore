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
  function setCatalogCachePolicy(_request, response, next) {
    response.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
    response.vary('X-Store-Key');
    response.vary('Origin');
    return next();
  }

  router.get('/storefront/home', setCatalogCachePolicy, publicReadLimit, controller.home);
  router.get('/products', setCatalogCachePolicy, publicReadLimit, controller.listProducts);
  router.get('/products/:identifier', setCatalogCachePolicy, publicReadLimit, controller.getProduct);
  router.get('/categories', setCatalogCachePolicy, publicReadLimit, controller.listCategories);
  router.get('/categories/:id', setCatalogCachePolicy, publicReadLimit, controller.getCategory);

  return router;
}

module.exports = createCatalogRoutes;
