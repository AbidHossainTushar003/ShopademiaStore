const path = require('node:path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const healthRoutes = require('./routes/v1/health.routes');
const errorHandler = require('./middleware/error-handler');
const notFound = require('./middleware/not-found');
const createReadinessRoutes = require('./routes/v1/readiness.routes');
const createCatalogRoutes = require('./routes/v1/catalog.routes');
const createAdminAuthRoutes = require('./routes/v1/admin-auth.routes');
const createAdminCatalogRoutes = require('./routes/v1/admin-catalog.routes');
const createCustomerAuthRoutes = require('./routes/v1/customer-auth.routes');
const createCustomerRoutes = require('./routes/v1/customers.routes');
const requestId = require('./middleware/request-id');

function createApp(config, pool) {
  if (!config.auth) {
    throw new Error('Authentication configuration is required.');
  }

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || config.allowedOrigins.includes(origin));
    },
  }));
  app.use(requestId);
  app.use(express.json({ limit: '100kb' }));
  app.use('/media/products', express.static(
    path.resolve(__dirname, 'storage', 'product-images'),
    {
      dotfiles: 'deny',
      fallthrough: true,
      index: false,
      redirect: false,
    },
  ));
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1', createReadinessRoutes(pool));
  app.use('/api/v1', createCatalogRoutes(pool));
  app.use('/api/v1/admin/auth', createAdminAuthRoutes(pool, config.auth));
  app.use('/api/v1/admin', createAdminCatalogRoutes(pool, config.auth));
  app.use('/api/v1/auth', createCustomerAuthRoutes(pool, config.auth));
  app.use('/api/v1/customers', createCustomerRoutes(pool, config.auth));
  app.use(notFound);
  app.use(errorHandler(config));

  return app;
}

module.exports = createApp;
