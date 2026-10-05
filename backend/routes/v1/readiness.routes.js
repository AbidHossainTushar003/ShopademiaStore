const express = require('express');
const createReadinessController = require('../../controllers/readiness.controller');

function createReadinessRoutes(pool) {
  const router = express.Router();

  router.get('/health/ready', createReadinessController(pool));

  return router;
}

module.exports = createReadinessRoutes;
