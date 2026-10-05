const express = require('express');
const createCustomerAuthentication = require('../../middleware/customer-authentication');
const createCustomerProfileController = require('../../controllers/customer-profile.controller');
const customerRequestLimit = require('../../middleware/customer-request-limit');

function createCustomerRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createCustomerProfileController(pool);

  router.use(
    customerRequestLimit,
    createCustomerAuthentication(pool, authConfig),
  );
  router.get('/me', controller.getMe);
  router.patch('/me', controller.updateMe);

  return router;
}

module.exports = createCustomerRoutes;
