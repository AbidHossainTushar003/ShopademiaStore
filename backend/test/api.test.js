const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {
  authConfig,
  request,
  startTestServer,
  storeKeys,
} = require('../support/app-fixture');

async function withServer(callback, options) {
  const fixture = await startTestServer(options);
  try {
    await callback(fixture);
  } finally {
    await fixture.close();
  }
}

test('liveness is independent of the database; readiness reflects database availability', async () => {
  await withServer(async ({ baseUrl, pool }) => {
    const live = await request(baseUrl, '/api/v1/health');
    assert.equal(live.status, 200);
    assert.deepEqual(live.json, { success: true, data: { status: 'ok' } });
    assert.equal(pool.calls.length, 0);

    const ready = await request(baseUrl, '/api/v1/health/ready');
    assert.equal(ready.status, 200);
    assert.deepEqual(ready.json, { success: true, data: { status: 'ready' } });
  });

  await withServer(async ({ baseUrl }) => {
    const response = await request(baseUrl, '/api/v1/health/ready');
    assert.equal(response.status, 503);
    assert.deepEqual(response.json, {
      success: false,
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is not ready.' },
    });
    assert.doesNotMatch(response.text, /secret|database failure|stack/i);
  }, { failReadiness: true });
});

test('catalog requires a valid store credential and returns only that store catalog', async () => {
  await withServer(async ({ baseUrl }) => {
    const missing = await request(baseUrl, '/api/v1/products');
    assert.equal(missing.status, 401);

    const invalid = await request(baseUrl, '/api/v1/products', {
      headers: { 'X-Store-Key': 'sk_invalid' },
    });
    assert.equal(invalid.status, 401);

    const storeOne = await request(baseUrl, '/api/v1/products', {
      headers: { 'X-Store-Key': storeKeys[1] },
    });
    assert.equal(storeOne.status, 200);
    assert.equal(storeOne.json.data[0].name, 'One Product');
    assert.equal(storeOne.headers['cache-control'], 'private, no-cache, must-revalidate');
    assert.equal(storeOne.headers.vary, 'X-Store-Key, Origin');

    const storeTwo = await request(baseUrl, '/api/v1/products', {
      headers: { 'X-Store-Key': storeKeys[2] },
    });
    assert.equal(storeTwo.status, 200);
    assert.equal(storeTwo.json.data[0].name, 'Two Product');
  });
});

test('revoked or inactive store credentials are rejected', async () => {
  await withServer(async ({ baseUrl }) => {
    for (const storeId of ['1', '2']) {
      const response = await request(baseUrl, '/api/v1/products', {
        headers: { 'X-Store-Key': storeKeys[Number(storeId)] },
      });
      assert.equal(response.status, 401);
    }
  }, { invalidStoreIds: ['1', '2'] });
});

test('store A cannot read store B product by changing the product identifier', async () => {
  await withServer(async ({ baseUrl, pool }) => {
    const response = await request(baseUrl, '/api/v1/products/two-product', {
      headers: { 'X-Store-Key': storeKeys[1] },
    });
    assert.equal(response.status, 404);
    assert.deepEqual(response.json.error.code, 'NOT_FOUND');
    const productQuery = pool.calls.find(({ sql }) => sql.includes('WHERE p.slug = ?'));
    assert.equal(productQuery.parameters[0], '1');
  });
});

test('catalog filters bind search input and reject injected sort expressions', async () => {
  await withServer(async ({ baseUrl, pool }) => {
    const injection = "' OR 1=1 --";
    const search = await request(baseUrl, `/api/v1/products?q=${encodeURIComponent(injection)}`, {
      headers: { 'X-Store-Key': storeKeys[1] },
    });
    assert.equal(search.status, 200);
    const countQuery = pool.calls.find(({ sql }) => (
      sql.includes('COUNT(*) AS total') && sql.includes('FROM products p')
    ));
    assert.match(countQuery.sql, /p\.name LIKE \? ESCAPE '!'/);
    assert.equal(countQuery.parameters.at(-1), "' OR 1=1 --%");

    const badSort = await request(
      baseUrl,
      `/api/v1/products?sort=${encodeURIComponent('name; DROP TABLE products')}`,
      { headers: { 'X-Store-Key': storeKeys[1] } },
    );
    assert.equal(badSort.status, 400);
    assert.equal(pool.calls.some(({ sql }) => sql.includes('DROP TABLE')), false);
  });
});

test('customer credentials cannot authenticate to admin routes; invalid customer token is rejected', async () => {
  await withServer(async ({ baseUrl, pool }) => {
    const customerToken = jwt.sign({}, authConfig.customerJwtSecret, {
      algorithm: 'HS256',
      subject: '1',
      issuer: authConfig.issuer,
      audience: authConfig.customerAudience,
      expiresIn: 900,
    });
    const adminResponse = await request(baseUrl, '/api/v1/admin/stores', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(adminResponse.status, 401);
    assert.equal(adminResponse.headers['cache-control'], 'private, no-store');

    const invalidCustomer = await request(baseUrl, '/api/v1/cart', {
      headers: {
        'X-Store-Key': storeKeys[1],
        Authorization: 'Bearer tampered-or-expired',
      },
    });
    assert.equal(invalidCustomer.status, 401);
    assert.equal(invalidCustomer.headers['cache-control'], 'private, no-store');
    assert.equal(pool.calls.some(({ sql }) => sql.includes('FROM customers')), false);
  });
});

test('an admin with a non-super-admin role is forbidden from managing stores', async () => {
  await withServer(async ({ baseUrl }) => {
    const adminToken = jwt.sign({}, authConfig.adminJwtSecret, {
      algorithm: 'HS256',
      subject: '9',
      issuer: authConfig.issuer,
      audience: authConfig.adminAudience,
      expiresIn: 900,
    });
    const response = await request(baseUrl, '/api/v1/admin/stores', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(response.status, 403);
    assert.equal(response.json.error.code, 'FORBIDDEN');
  }, { adminRole: 'admin' });
});

test('repeated failed admin logins are rate limited', async () => {
  await withServer(async ({ baseUrl }) => {
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await request(baseUrl, '/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'unknown@example.invalid',
          password: 'invalid-password',
        }),
      }));
    }
    assert.deepEqual(responses.slice(0, 5).map(({ status }) => status), [401, 401, 401, 401, 401]);
    assert.equal(responses[5].status, 429);
  });
});

test('oversized JSON is rejected before cart processing', async () => {
  await withServer(async ({ baseUrl }) => {
    const body = JSON.stringify({ padding: 'x'.repeat(101 * 1024) });
    const response = await request(baseUrl, '/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'X-Store-Key': storeKeys[1],
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
      },
      body,
    });
    assert.equal(response.status, 413);
    assert.deepEqual(response.json.error.code, 'PAYLOAD_TOO_LARGE');
  });
});

test('disallowed CORS origins receive no allow-origin header', async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await request(baseUrl, '/api/v1/products', {
      headers: {
        'X-Store-Key': storeKeys[1],
        Origin: 'https://unregistered.example',
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  });
});

test('production API errors do not expose internal messages or secrets', async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await request(baseUrl, '/api/v1/products', {
      headers: { 'X-Store-Key': storeKeys[1] },
    });
    assert.equal(response.status, 500);
    assert.deepEqual(response.json.error, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    });
    assert.doesNotMatch(response.text, /unexpected test query|stack|secret/i);
  }, { failCatalog: true, nodeEnv: 'production' });
});

test('request logs are structured, correlate by request ID, and omit credentials', async () => {
  await withServer(async ({ baseUrl }) => {
    const originalLog = console.log;
    const entries = [];
    console.log = (entry) => entries.push(entry);
    try {
      await request(baseUrl, '/api/v1/products', {
        headers: {
          'X-Store-Key': storeKeys[1],
          Authorization: 'Bearer request-secret-token',
        },
      });
    } finally {
      console.log = originalLog;
    }

    assert.equal(entries.length, 1);
    const event = JSON.parse(entries[0]);
    assert.equal(event.event, 'http.request.completed');
    assert.match(event.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(event.path, '/api/v1/products');
    assert.equal(event.statusCode, 500);
    assert.doesNotMatch(entries[0], /request-secret-token|sk_[A-Za-z0-9_-]{43}|Authorization/i);
  }, { failCatalog: true, nodeEnv: 'production' });
});
