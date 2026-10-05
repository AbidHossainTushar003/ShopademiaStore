const express = require('express');
const createCustomerAuthentication = require('../../middleware/customer-authentication');
const createOrdersController = require('../../controllers/orders.controller');

function createOrdersRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createOrdersController(pool);
  const authenticate = createCustomerAuthentication(pool, authConfig);
  router.post('/checkout', authenticate, controller.checkout);
  router.get('/orders', authenticate, controller.listMine);
  router.get('/orders/:orderId', authenticate, controller.getMine);
  return router;
}

module.exports = createOrdersRoutes;
