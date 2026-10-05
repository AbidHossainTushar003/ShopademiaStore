const createApp = require('./app');
const { ConfigurationError, loadConfig } = require('./config/config');

try {
  const config = loadConfig();
  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Shopademia API listening on port ${config.port}.`);
  });

  server.on('error', (error) => {
    console.error(`Failed to start Shopademia API (${error.code || 'UNKNOWN'}).`);
    process.exitCode = 1;
  });
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`Configuration error: ${error.message}`);
  } else {
    console.error('Failed to start Shopademia API.');
  }
  process.exitCode = 1;
}
