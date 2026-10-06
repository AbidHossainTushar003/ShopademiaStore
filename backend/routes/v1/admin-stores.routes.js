const express = require('express');
const createAdminAuthentication = require('../../middleware/admin-authentication');
const requireRoles = require('../../middleware/require-roles');
const { authorizeStoreRequest } = require('../../middleware/store-context');
const createAdminStoresController = require('../../controllers/admin-stores.controller');
const adminRequestLimit = require('../../middleware/admin-request-limit');

function createAdminStoresRoutes(pool, authConfig, nodeEnv) {
  const router = express.Router();
  const controller = createAdminStoresController(pool, nodeEnv);
  const authenticate = createAdminAuthentication(pool, authConfig);
  const requestLimit = adminRequestLimit;

  router.get('/stores', requestLimit, authenticate, requireRoles('super_admin'), controller.list);
  router.get('/stores/:storeId', requestLimit, authenticate, requireRoles('super_admin'), controller.get);
  router.post('/stores', requestLimit, authenticate, requireRoles('super_admin'), controller.create);
  router.patch('/stores/:storeId', requestLimit, authenticate, requireRoles('super_admin'), controller.update);
  router.get(
    '/stores/:storeId/admins',
    requestLimit,
    authenticate,
    requireRoles('super_admin'),
    controller.listAdmins,
  );
  router.patch(
    '/stores/:storeId/status',
    requestLimit,
    authenticate,
    requireRoles('super_admin'),
    controller.updateStatus,
  );
  router.post(
    '/stores/:storeId/keys/rotate',
    requestLimit,
    authenticate,
    requireRoles('super_admin'),
    controller.rotateKey,
  );
  router.delete(
    '/stores/:storeId/keys/current',
    requestLimit,
    authenticate,
    requireRoles('super_admin'),
    controller.revokeKey,
  );
  router.put(
    '/stores/:storeId/admins/:adminId',
    requestLimit,
    authenticate,
    requireRoles('super_admin'),
    controller.assignAdmin,
  );
  router.delete(
    '/stores/:storeId/admins/:adminId',
    requestLimit,
    authenticate,
    requireRoles('super_admin'),
    controller.removeAdmin,
  );
  router.put(
    '/stores/:storeId/products/:productId/visibility',
    requestLimit,
    authenticate,
    requireRoles('super_admin', 'admin'),
    authorizeStoreRequest(pool),
    controller.updateVisibility,
  );

  return router;
}

module.exports = createAdminStoresRoutes;
