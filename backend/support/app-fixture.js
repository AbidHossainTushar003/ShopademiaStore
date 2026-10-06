const { createHash } = require('node:crypto');
const http = require('node:http');
const createApp = require('../app');

const authConfig = Object.freeze({
  adminJwtSecret: 'test-only-admin-signing-secret-which-is-not-a-credential',
  customerJwtSecret: 'test-only-customer-signing-secret-which-is-not-a-credential',
  issuer: 'shopademia-api-test',
  adminAudience: 'shopademia-admin-test',
  customerAudience: 'shopademia-customer-test',
  adminTokenLifetime: 900,
  customerTokenLifetime: 900,
});

const storeKeys = Object.freeze({
  1: `sk_${Buffer.alloc(32, 1).toString('base64url')}`,
  2: `sk_${Buffer.alloc(32, 2).toString('base64url')}`,
});

const products = Object.freeze({
  1: {
    product_id: '101',
    category_id: '11',
    category_name: 'Store One',
    category_slug: 'store-one',
    name: 'One Product',
    slug: 'one-product',
    description: 'Store one catalog item',
    price_minor: '1499',
    currency_code: 'USD',
    availability: 'in_stock',
  },
  2: {
    product_id: '202',
    category_id: '22',
    category_name: 'Store Two',
    category_slug: 'store-two',
    name: 'Two Product',
    slug: 'two-product',
    description: 'Store two catalog item',
    price_minor: '2599',
    currency_code: 'USD',
    availability: 'in_stock',
  },
});

function createPool({
  adminRole = 'admin',
  failReadiness = false,
  failCatalog = false,
  invalidStoreIds = [],
  storeAllowedOrigins = ['https://store-one.example'],
} = {}) {
  const calls = [];
  const keysByHash = new Map(
    Object.entries(storeKeys).map(([storeId, key]) => [
      createHash('sha256').update(key).digest('hex'),
      storeId,
    ]),
  );

  return {
    calls,
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });

      if (sql.includes('credential_hash = ?')) {
        const storeId = keysByHash.get(parameters[0]);
        if (!storeId || invalidStoreIds.includes(storeId)) {
          return [[], []];
        }
        return [[{
          store_id: storeId,
          name: `Store ${storeId}`,
          slug: `store-${storeId}`,
          status: 'active',
          credential_hash: parameters[0],
          key_revoked_at: null,
          allowed_origins: storeAllowedOrigins,
        }], []];
      }

      if (sql.includes('JSON_CONTAINS(allowed_origins')) {
        return [storeAllowedOrigins.includes(parameters[0]) ? [{ store_id: '1' }] : [], []];
      }

      if (sql === 'SELECT 1') {
        if (failReadiness) {
          throw new Error('test database failure secret must not escape');
        }
        return [[{ 1: 1 }], []];
      }

      if (sql.includes('FROM admin_users')) {
        return [[{
          admin_user_id: '9',
          email: 'test-admin@example.invalid',
          display_name: 'Test Admin',
          status: 'active',
          role_name: adminRole,
        }], []];
      }

      if (sql.startsWith('INSERT INTO audit_logs')) {
        return [{ insertId: 1 }, []];
      }

      if (sql.includes('FROM audit_logs WHERE audit_log_id = ?')) {
        return [[{ audit_log_id: 1 }], []];
      }

      if (failCatalog && sql.includes('FROM products p')) {
        throw new Error('test catalog failure secret must not escape');
      }

      const storeId = String(parameters[0]);
      const product = products[storeId];

      if (sql.includes('COUNT(*) AS total') && sql.includes('FROM products p')) {
        return [[{ total: product ? 1 : 0 }], []];
      }

      if (sql.includes('FROM products p') && sql.includes('WHERE p.slug = ?')) {
        return [[product && product.slug === parameters[1] ? product : null].filter(Boolean), []];
      }

      if (sql.includes('FROM products p') && sql.includes('WHERE p.product_id = ?')) {
        return [[product && product.product_id === parameters[1] ? product : null].filter(Boolean), []];
      }

      if (sql.includes('FROM products p') && sql.includes('store_products')) {
        return [product ? [product] : [], []];
      }

      if (sql.includes('FROM product_images')) {
        return [[], []];
      }

      throw new Error(`Unexpected test query: ${sql}`);
    },
  };
}

function startTestServer(options) {
  const pool = createPool(options);
  const config = {
    nodeEnv: options?.nodeEnv || 'test',
    trustProxy: options?.trustProxy || false,
    allowedOrigins: ['https://store-one.example'],
    auth: authConfig,
  };
  const app = createApp(config, pool);
  const server = app.listen(0);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', () => {
      server.removeListener('error', reject);
      resolve({
        pool,
        app,
        server,
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done, fail) => {
          server.close((error) => (error ? fail(error) : done()));
        }),
      });
    });
  });
}

function request(baseUrl, pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request(`${baseUrl}${pathname}`, { method, headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = text ? JSON.parse(text) : undefined;
        } catch {
          json = undefined;
        }
        resolve({ status: response.statusCode, headers: response.headers, text, json });
      });
    });
    outgoing.on('error', reject);
    if (body !== undefined) {
      outgoing.write(body);
    }
    outgoing.end();
  });
}

module.exports = { authConfig, createPool, request, startTestServer, storeKeys };
