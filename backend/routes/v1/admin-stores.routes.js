const express = require('express');
const createAdminAuthentication = require('../../middleware/admin-authentication');
const requireRoles = require('../../middleware/require-roles');
const { authorizeStoreRequest } = require('../../middleware/store-context');
const createAdminStoresController = require('../../controllers/admin-stores.controller');

function createAdminStoresRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createAdminStoresController(pool);
  const authenticate = createAdminAuthentication(pool, authConfig);

  router.get('/stores', authenticate, requireRoles('super_admin'), controller.list);
  router.get('/stores/:storeId', authenticate, requireRoles('super_admin'), controller.get);
  router.post('/stores', authenticate, requireRoles('super_admin'), controller.create);
  router.patch('/stores/:storeId', authenticate, requireRoles('super_admin'), controller.update);
  router.get(
    '/stores/:storeId/admins',
    authenticate,
    requireRoles('super_admin'),
    controller.listAdmins,
  );
  router.patch(
    '/stores/:storeId/status',
    authenticate,
    requireRoles('super_admin'),
    controller.updateStatus,
  );
  router.post(
    '/stores/:storeId/keys/rotate',
    authenticate,
    requireRoles('super_admin'),
    controller.rotateKey,
  );
  router.delete(
    '/stores/:storeId/keys/current',
    authenticate,
    requireRoles('super_admin'),
    controller.revokeKey,
  );
  router.put(
    '/stores/:storeId/admins/:adminId',
    authenticate,
    requireRoles('super_admin'),
    controller.assignAdmin,
  );
  router.delete(
    '/stores/:storeId/admins/:adminId',
    authenticate,
    requireRoles('super_admin'),
    controller.removeAdmin,
  );
  router.put(
    '/stores/:storeId/products/:productId/visibility',
    authenticate,
    requireRoles('super_admin', 'admin'),
    authorizeStoreRequest(pool),
    controller.updateVisibility,
  );

  return router;
}

module.exports = createAdminStoresRoutes;
