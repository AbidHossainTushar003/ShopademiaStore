const createApp = require('./app');
const { ConfigurationError, loadConfig } = require('./config/config');
const { checkDatabaseConnection, createPool } = require('./database/pool');

async function closeServer(server, pool) {
  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } finally {
    await pool.end();
  }
}

async function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once('error', reject);
    server.once('listening', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

async function startServer(config = loadConfig()) {
  const pool = createPool(config.database);
  let server;

  try {
    await checkDatabaseConnection(pool);
    server = await listen(createApp(config, pool), config.port);
  } catch (error) {
    await pool.end();
    throw error;
  }

  console.log(`Shopademia API listening on port ${config.port}.`);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    try {
      await closeServer(server, pool);
      console.log('Shopademia API shut down cleanly.');
    } catch {
      console.error('Shopademia API shutdown encountered an error.');
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return { server, pool, shutdown };
}

if (require.main === module) {
  startServer().catch((error) => {
    if (error instanceof ConfigurationError) {
      console.error(`Configuration error: ${error.message}`);
    } else {
      console.error('API startup failed. Confirm database availability and port settings.');
    }
    process.exitCode = 1;
  });
}

module.exports = { closeServer, startServer };
