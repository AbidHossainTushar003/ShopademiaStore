const express = require('express');
const createCartController = require('../../controllers/cart.controller');
const createCustomerAuthentication = require('../../middleware/customer-authentication');
const customerRequestLimit = require('../../middleware/customer-request-limit');

function createCartRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createCartController(pool);

  router.use(
    customerRequestLimit,
    createCustomerAuthentication(pool, authConfig),
  );
  router.get('/', controller.getCart);
  router.post('/items', controller.addItem);
  router.patch('/items/:itemId', controller.updateItem);
  router.delete('/items/:itemId', controller.removeItem);
  router.delete('/', controller.clearCart);

  return router;
}

module.exports = createCartRoutes;
