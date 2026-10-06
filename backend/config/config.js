const path = require('node:path');
const net = require('node:net');
const dotenv = require('dotenv');

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function parsePort(value, variableName = 'PORT') {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(`${variableName} must be an integer between 1 and 65535.`);
  }

  return port;
}

function parsePoolSize(value) {
  const poolSize = Number(value);

  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 50) {
    throw new ConfigurationError('DB_POOL_SIZE must be an integer between 1 and 50.');
  }

  return poolSize;
}

function parseTrustProxy(value) {
  const setting = typeof value === 'string' ? value.trim() : '';

  if (!setting || setting === '0' || setting.toLowerCase() === 'false') {
    return false;
  }

  if (setting === '*' || setting.toLowerCase() === 'true') {
    throw new ConfigurationError('TRUST_PROXY must not be true or a wildcard.');
  }

  if (/^[1-9]\d*$/.test(setting)) {
    const hops = Number(setting);
    if (Number.isSafeInteger(hops)) {
      return hops;
    }
    throw new ConfigurationError('TRUST_PROXY hop count must be a positive safe integer.');
  }

  const proxies = setting.split(',').map((proxy) => proxy.trim());
  if (proxies.some((proxy) => !proxy || proxy === '*')) {
    throw new ConfigurationError('TRUST_PROXY must contain explicit trusted proxy IPs or CIDRs.');
  }

  for (const proxy of proxies) {
    const [address, prefix, ...extra] = proxy.split('/');
    const addressType = net.isIP(address);
    if (!addressType || extra.length > 0) {
      throw new ConfigurationError('TRUST_PROXY must contain explicit trusted proxy IPs or CIDRs.');
    }

    if (prefix !== undefined) {
      const maxPrefix = addressType === 4 ? 32 : 128;
      if (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > maxPrefix) {
        throw new ConfigurationError('TRUST_PROXY CIDR ranges must not be wildcards and must be valid.');
      }
    }
  }

  return proxies;
}

function parseTokenLifetime(value, variableName = 'ADMIN_ACCESS_TOKEN_TTL_SECONDS') {
  const lifetime = Number(value);

  if (!Number.isInteger(lifetime) || lifetime < 300 || lifetime > 1800) {
    throw new ConfigurationError(
      `${variableName} must be an integer between 300 and 1800.`,
    );
  }

  return lifetime;
}

function parseAllowedOrigins(value, nodeEnv = 'development') {
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
    if (nodeEnv === 'production' && parsedOrigin.protocol !== 'https:') {
      throw new ConfigurationError('ALLOWED_ORIGINS must use HTTPS in production.');
    }
  }

  return origins;
}

function requireEnvironmentValue(name, { preserveWhitespace = false } = {}) {
  const value = process.env[name];
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new ConfigurationError(`Missing required environment variable: ${name}.`);
  }

  return preserveWhitespace ? value : trimmedValue;
}

function hasWeakSecretStructure(secret) {
  const characters = Array.from(secret);
  const frequencies = new Map();
  for (const character of characters) {
    frequencies.set(character, (frequencies.get(character) || 0) + 1);
  }

  const entropy = Array.from(frequencies.values()).reduce((sum, frequency) => {
    const probability = frequency / characters.length;
    return sum - probability * Math.log2(probability);
  }, 0);

  return frequencies.size < 12 ||
    entropy < 3 ||
    Math.max(...frequencies.values()) / characters.length > 0.25;
}

function loadConfig({ requireMigrationCredentials = false } = {}) {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

  const portValue = requireEnvironmentValue('PORT');
  const nodeEnvValue = requireEnvironmentValue('NODE_ENV');
  const allowedOriginsValue = requireEnvironmentValue('ALLOWED_ORIGINS');
  const databaseHost = requireEnvironmentValue('DB_HOST');
  const databasePort = parsePort(requireEnvironmentValue('DB_PORT'), 'DB_PORT');
  const databaseUser = requireEnvironmentValue('DB_USER');
  const databasePassword = requireEnvironmentValue('DB_PASSWORD', { preserveWhitespace: true });
  const databaseName = requireEnvironmentValue('DB_NAME');
  const databasePoolSize = parsePoolSize(requireEnvironmentValue('DB_POOL_SIZE'));
  const adminJwtSecret = requireEnvironmentValue('ADMIN_JWT_SECRET', { preserveWhitespace: true });
  const customerJwtSecret = requireEnvironmentValue('CUSTOMER_JWT_SECRET', { preserveWhitespace: true });
  const adminTokenLifetime = parseTokenLifetime(
    requireEnvironmentValue('ADMIN_ACCESS_TOKEN_TTL_SECONDS'),
  );
  const customerTokenLifetime = parseTokenLifetime(
    process.env.CUSTOMER_ACCESS_TOKEN_TTL_SECONDS?.trim() || String(adminTokenLifetime),
    'CUSTOMER_ACCESS_TOKEN_TTL_SECONDS',
  );

  if (databaseUser.toLowerCase() === 'root') {
    throw new ConfigurationError('DB_USER must not be the MySQL root account.');
  }

  if (!/^[A-Za-z0-9_$]+$/.test(databaseName)) {
    throw new ConfigurationError('DB_NAME must contain only letters, numbers, underscores, or dollar signs.');
  }

  const nodeEnv = nodeEnvValue;

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new ConfigurationError('NODE_ENV must be development, test, or production.');
  }

  if (Buffer.byteLength(adminJwtSecret, 'utf8') < 32 || Buffer.byteLength(customerJwtSecret, 'utf8') < 32) {
    throw new ConfigurationError('Admin and customer token secrets must each be at least 32 bytes.');
  }

  if (adminJwtSecret === customerJwtSecret) {
    throw new ConfigurationError('Admin and customer token secrets must be different.');
  }

  if (nodeEnv === 'production') {
    const placeholders = ['replace_with_', 'change_me', 'example'];

    for (const [name, secret] of [
      ['ADMIN_JWT_SECRET', adminJwtSecret],
      ['CUSTOMER_JWT_SECRET', customerJwtSecret],
    ]) {
      if (placeholders.some((placeholder) => secret.toLowerCase().includes(placeholder))) {
        throw new ConfigurationError(`${name} must be replaced with a strong random secret in production.`);
      }
    }
    for (const [name, secret] of [
      ['ADMIN_JWT_SECRET', adminJwtSecret],
      ['CUSTOMER_JWT_SECRET', customerJwtSecret],
    ]) {
      if (hasWeakSecretStructure(secret)) {
        throw new ConfigurationError(
          `${name} must use a cryptographically random value with sufficient character diversity in production.`,
        );
      }
    }
  }

  const migrationUser = process.env.DB_MIGRATION_USER?.trim();
  const migrationPassword = process.env.DB_MIGRATION_PASSWORD;
  const hasMigrationPassword = Boolean(migrationPassword?.trim());

  if (Boolean(migrationUser) !== hasMigrationPassword) {
    throw new ConfigurationError('DB_MIGRATION_USER and DB_MIGRATION_PASSWORD must be set together.');
  }

  if (requireMigrationCredentials && (!migrationUser || !hasMigrationPassword)) {
    throw new ConfigurationError(
      'DB_MIGRATION_USER and DB_MIGRATION_PASSWORD are required to run migrations.',
    );
  }

  if (migrationUser?.toLowerCase() === 'root') {
    throw new ConfigurationError('DB_MIGRATION_USER must not be the MySQL root account.');
  }

  return {
    port: parsePort(portValue),
    nodeEnv,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    allowedOrigins: parseAllowedOrigins(allowedOriginsValue, nodeEnv),
    database: {
      host: databaseHost,
      port: databasePort,
      user: databaseUser,
      password: databasePassword,
      name: databaseName,
      poolSize: databasePoolSize,
    },
    migrationCredentials: migrationUser
      ? { user: migrationUser, password: migrationPassword }
      : null,
    auth: {
      adminJwtSecret,
      customerJwtSecret,
      adminTokenLifetime,
      customerTokenLifetime,
      issuer: 'shopademia-api',
      adminAudience: 'shopademia-admin',
      customerAudience: 'shopademia-customer',
    },
  };
}

module.exports = {
  ConfigurationError,
  loadConfig,
  parseAllowedOrigins,
  parseTrustProxy,
};
