const express = require('express');
const createAdminAuthentication = require('../../middleware/admin-authentication');
const requireRoles = require('../../middleware/require-roles');
const createAdminOrdersController = require('../../controllers/admin-orders.controller');

function createAdminOrdersRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createAdminOrdersController(pool);
  const authenticate = createAdminAuthentication(pool, authConfig);
  const authorize = requireRoles('super_admin', 'admin');
  router.get('/orders', authenticate, authorize, controller.list);
  router.get('/orders/:orderId', authenticate, authorize, controller.get);
  router.patch('/orders/:orderId/status', authenticate, authorize, controller.updateOrderStatus);
  router.patch('/orders/:orderId/payment-status', authenticate, authorize, controller.updatePaymentStatus);
  return router;
}

module.exports = createAdminOrdersRoutes;
