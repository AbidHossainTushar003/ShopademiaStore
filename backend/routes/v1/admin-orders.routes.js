const express = require('express');
const createAdminAuthentication = require('../../middleware/admin-authentication');
const requireRoles = require('../../middleware/require-roles');
const { authorizeStoreRequest } = require('../../middleware/store-context');
const createAdminOrdersController = require('../../controllers/admin-orders.controller');
const adminRequestLimit = require('../../middleware/admin-request-limit');

function createAdminOrdersRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createAdminOrdersController(pool);
  const authenticate = createAdminAuthentication(pool, authConfig);
  const authorize = requireRoles('super_admin', 'admin');
  const storeAccess = authorizeStoreRequest(pool);
  const requestLimit = adminRequestLimit;
  router.get('/stores/:storeId/orders', requestLimit, authenticate, authorize, storeAccess, controller.list);
  router.get('/stores/:storeId/orders/:orderId', requestLimit, authenticate, authorize, storeAccess, controller.get);
  router.patch(
    '/stores/:storeId/orders/:orderId/status',
    requestLimit,
    authenticate,
    authorize,
    storeAccess,
    controller.updateOrderStatus,
  );
  router.patch(
    '/stores/:storeId/orders/:orderId/payment-status',
    requestLimit,
    authenticate,
    authorize,
    storeAccess,
    controller.updatePaymentStatus,
  );
  return router;
}

module.exports = createAdminOrdersRoutes;
