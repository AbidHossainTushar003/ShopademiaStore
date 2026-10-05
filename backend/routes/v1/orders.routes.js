const express = require('express');
const createCustomerAuthentication = require('../../middleware/customer-authentication');
const createOrdersController = require('../../controllers/orders.controller');
const customerRequestLimit = require('../../middleware/customer-request-limit');

function createOrdersRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createOrdersController(pool);
  const authenticate = createCustomerAuthentication(pool, authConfig);
  router.post('/checkout', customerRequestLimit, authenticate, controller.checkout);
  router.get('/orders', customerRequestLimit, authenticate, controller.listMine);
  router.get('/orders/:orderId', customerRequestLimit, authenticate, controller.getMine);
  return router;
}

module.exports = createOrdersRoutes;
