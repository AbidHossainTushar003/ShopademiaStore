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
const createCartRoutes = require('./routes/v1/cart.routes');
const createOrdersRoutes = require('./routes/v1/orders.routes');
const createAdminOrdersRoutes = require('./routes/v1/admin-orders.routes');
const createAdminStoresRoutes = require('./routes/v1/admin-stores.routes');
const requestId = require('./middleware/request-id');
const { authorizeStoreImage, createStoreContext } = require('./middleware/store-context');
const limitPublicMediaRequests = require('./middleware/public-media-request-limit');
const requestLogger = require('./middleware/request-logger');

function createApp(config, pool) {
  if (!config.auth) {
    throw new Error('Authentication configuration is required.');
  }

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(helmet());
  app.use(requestId);
  app.use(requestLogger);
  app.use(createStoreContext(pool));
  app.use('/api/v1/admin', (_request, response, next) => {
    response.setHeader('Cache-Control', 'private, no-store');
    return next();
  });
  app.use(['/api/v1/auth', '/api/v1/customers', '/api/v1/cart', '/api/v1/orders'], (
    _request,
    response,
    next,
  ) => {
    response.setHeader('Cache-Control', 'private, no-store');
    return next();
  });
  app.use('/media/products', limitPublicMediaRequests);
  app.use(cors((request, callback) => {
    const origin = request.get('origin');
    const allowed = request.store
      ? request.store.allowed_origins.includes(origin)
      : request.storeScopedRequest
        ? request.storeOriginAllowed
        : config.allowedOrigins.includes(origin);
    callback(null, { origin: origin && allowed ? origin : false });
  }));
  app.use(authorizeStoreImage(pool));
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
  app.use('/api/v1/admin', createAdminStoresRoutes(pool, config.auth));
  app.use('/api/v1/admin', createAdminOrdersRoutes(pool, config.auth));
  app.use('/api/v1/admin', createAdminCatalogRoutes(pool, config.auth));
  app.use('/api/v1/auth', createCustomerAuthRoutes(pool, config.auth));
  app.use('/api/v1/customers', createCustomerRoutes(pool, config.auth));
  app.use('/api/v1/cart', createCartRoutes(pool, config.auth));
  app.use('/api/v1', createOrdersRoutes(pool, config.auth));
  app.use(notFound);
  app.use(errorHandler(config));

  return app;
}

module.exports = createApp;
