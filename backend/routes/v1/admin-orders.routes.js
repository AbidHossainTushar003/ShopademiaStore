const express = require('express');
const createAdminAuthentication = require('../../middleware/admin-authentication');
const requireRoles = require('../../middleware/require-roles');
const { authorizeStoreRequest } = require('../../middleware/store-context');
const createAdminOrdersController = require('../../controllers/admin-orders.controller');

function createAdminOrdersRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createAdminOrdersController(pool);
  const authenticate = createAdminAuthentication(pool, authConfig);
  const authorize = requireRoles('super_admin', 'admin');
  const storeAccess = authorizeStoreRequest(pool);
  router.get('/stores/:storeId/orders', authenticate, authorize, storeAccess, controller.list);
  router.get('/stores/:storeId/orders/:orderId', authenticate, authorize, storeAccess, controller.get);
  router.patch(
    '/stores/:storeId/orders/:orderId/status',
    authenticate,
    authorize,
    storeAccess,
    controller.updateOrderStatus,
  );
  router.patch(
    '/stores/:storeId/orders/:orderId/payment-status',
    authenticate,
    authorize,
    storeAccess,
    controller.updatePaymentStatus,
  );
  return router;
}

module.exports = createAdminOrdersRoutes;
