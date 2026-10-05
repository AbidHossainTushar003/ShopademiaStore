const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const createCustomerAuthController = require('../../controllers/customer-auth.controller');

function rateLimitResponse(_request, response) {
  return response.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Try again later.',
    },
  });
}

function createCustomerAuthRoutes(pool, authConfig) {
  const router = express.Router();
  const controller = createCustomerAuthController(pool, authConfig);
  const registrationLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitResponse,
  });
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

  router.post('/register', registrationLimit, controller.register);
  router.post('/login', overallLoginLimit, failedLoginLimit, controller.login);

  return router;
}

module.exports = createCustomerAuthRoutes;
