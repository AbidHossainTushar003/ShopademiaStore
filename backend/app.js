const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const healthRoutes = require('./routes/v1/health.routes');
const errorHandler = require('./middleware/error-handler');
const notFound = require('./middleware/not-found');

function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || config.allowedOrigins.includes(origin));
    },
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/v1', healthRoutes);
  app.use(notFound);
  app.use(errorHandler(config));

  return app;
}

module.exports = createApp;
