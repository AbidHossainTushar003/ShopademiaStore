const path = require('node:path');
const dotenv = require('dotenv');

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function parsePort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseAllowedOrigins(value) {
  const origins = value.split(',').map((origin) => origin.trim());

  if (origins.some((origin) => !origin || origin === '*')) {
    throw new ConfigurationError('ALLOWED_ORIGINS must contain specific origins, not a wildcard.');
  }

  for (const origin of origins) {
    let parsedOrigin;

    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new ConfigurationError('ALLOWED_ORIGINS must contain valid HTTP or HTTPS origins.');
    }

    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new ConfigurationError('ALLOWED_ORIGINS must contain valid HTTP or HTTPS origins.');
    }
  }

  return origins;
}

function loadConfig() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

  for (const variable of ['PORT', 'NODE_ENV', 'ALLOWED_ORIGINS']) {
    if (!process.env[variable]?.trim()) {
      throw new ConfigurationError(`Missing required environment variable: ${variable}.`);
    }
  }

  const nodeEnv = process.env.NODE_ENV.trim();

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new ConfigurationError('NODE_ENV must be development, test, or production.');
  }

  return {
    port: parsePort(process.env.PORT.trim()),
    nodeEnv,
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS.trim()),
  };
}

module.exports = { ConfigurationError, loadConfig };
