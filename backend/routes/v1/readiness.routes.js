const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const createReadinessController = require('../../controllers/readiness.controller');

function createReadinessRoutes(pool) {
  const router = express.Router();
  const readinessLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_request, response) {
      return response.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many readiness checks. Try again later.',
        },
      });
    },
  });

  router.get('/health/ready', readinessLimit, createReadinessController(pool));

  return router;
}

module.exports = createReadinessRoutes;
