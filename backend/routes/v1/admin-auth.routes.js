const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const createAdminAuthentication = require('../../middleware/admin-authentication');
const requireRoles = require('../../middleware/require-roles');
const createAdminAuthController = require('../../controllers/admin-auth.controller');

function rateLimitResponse(_request, response) {
  return response.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Try again later.',
    },
  });
}

function createAdminAuthRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createAdminAuthController(pool, authConfig);

  const overallLoginLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitResponse,
  });
  const failedLoginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitResponse,
  });
  const authenticate = createAdminAuthentication(pool, authConfig);

  router.post('/login', overallLoginLimit, failedLoginLimit, controller.login);
  router.get(
    '/me',
    authenticate,
    requireRoles('super_admin', 'admin'),
    controller.me,
  );

  return router;
}

module.exports = createAdminAuthRoutes;
