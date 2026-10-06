const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ConfigurationError,
  parseAllowedOrigins,
  parseTrustProxy,
} = require('../config/config');
const {
  validateCreateStoreBody,
  validateUpdateStoreBody,
} = require('../validators/stores.validators');
const { startTestServer } = require('../support/app-fixture');

test('global allowed origins require HTTPS in production but permit local HTTP in development', () => {
  assert.deepEqual(
    parseAllowedOrigins('https://shop.example', 'production'),
    ['https://shop.example'],
  );
  assert.deepEqual(
    parseAllowedOrigins('http://localhost:3000', 'development'),
    ['http://localhost:3000'],
  );
  assert.throws(
    () => parseAllowedOrigins('http://insecure.example', 'production'),
    ConfigurationError,
  );
});

test('store create and update reject HTTP origins in production', () => {
  assert.throws(
    () => validateCreateStoreBody({
      name: 'Example Store',
      slug: 'example-store',
      allowedOrigins: ['http://insecure.example'],
    }, { requireHttps: true }),
    /HTTPS origin in production/,
  );
  assert.throws(
    () => validateUpdateStoreBody({
      allowedOrigins: ['http://insecure.example'],
    }, { requireHttps: true }),
    /HTTPS origin in production/,
  );

  assert.deepEqual(
    validateCreateStoreBody({
      name: 'Example Store',
      slug: 'example-store',
      allowedOrigins: ['https://shop.example'],
    }, { requireHttps: true }).allowedOrigins,
    ['https://shop.example'],
  );
});

test('TRUST_PROXY accepts disabled, hop-count, and explicit proxy IP/CIDR settings only', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy('0'), false);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('2'), 2);
  assert.deepEqual(
    parseTrustProxy('10.0.0.1,192.168.0.0/24'),
    ['10.0.0.1', '192.168.0.0/24'],
  );

  for (const value of ['true', '*', '0.0.0.0/0', 'not-an-ip', '10.0.0.1,']) {
    assert.throws(() => parseTrustProxy(value), ConfigurationError, value);
  }
});

test('the validated TRUST_PROXY value is applied to the Express app', async () => {
  const fixture = await startTestServer({ trustProxy: ['127.0.0.1'] });
  try {
    assert.deepEqual(fixture.app.get('trust proxy'), ['127.0.0.1']);
  } finally {
    await fixture.close();
  }
});
