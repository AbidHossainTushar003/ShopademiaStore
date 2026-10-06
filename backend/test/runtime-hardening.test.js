const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { validateOrderListQuery } = require('../validators/order.validators');
const { removeImage, cleanupFailedUpload } = require('../services/admin-catalog.service');
const errorHandler = require('../middleware/error-handler');

function createImageRemovalPool(imageUrl, transaction) {
  const connection = {
    async beginTransaction() {},
    async commit() { transaction.committed = true; },
    async rollback() { transaction.rolledBack = true; },
    release() { transaction.released = true; },
    async execute(sql) {
      if (sql.includes('FROM product_images') && sql.includes('FOR UPDATE')) {
        return [[{
          product_image_id: '7',
          product_id: '6',
          image_url: imageUrl,
          alt_text: null,
          sort_order: 0,
          status: 'active',
          deleted_at: null,
        }], []];
      }
      if (sql.startsWith("UPDATE product_images SET status = 'inactive'")) {
        return [{ affectedRows: 1 }, []];
      }
      if (sql.startsWith('INSERT INTO audit_logs')) {
        return [{ insertId: 1 }, []];
      }
      if (sql.includes('FROM audit_logs WHERE audit_log_id = ?')) {
        return [[{ audit_log_id: 1 }], []];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  return { async getConnection() { return connection; } };
}

test('order pagination allows the maximum offset and rejects deeper offsets with 422', () => {
  assert.deepEqual(
    validateOrderListQuery({ page: '101', limit: '100' }),
    { page: 101, limit: 100, orderStatus: undefined, paymentStatus: undefined },
  );
  assert.throws(
    () => validateOrderListQuery({ page: '102', limit: '100' }),
    (error) => error.statusCode === 422 &&
      error.publicMessage.includes('10000 rows'),
  );
});

test('image removal succeeds when the database change committed but the file is already missing', async () => {
  const transaction = { committed: false, rolledBack: false, released: false };
  const imageUrl = `/media/products/${randomUUID()}.jpg`;

  const result = await removeImage(
    createImageRemovalPool(imageUrl, transaction),
    { id: '9' },
    'request-test-id',
    '6',
    '7',
  );

  assert.equal(result, true);
  assert.deepEqual(transaction, { committed: true, rolledBack: false, released: true });
});

test('image removal logs non-missing-file cleanup errors without undoing the committed change', async () => {
  const transaction = { committed: false, rolledBack: false, released: false };
  const originalLog = console.error;
  const logs = [];
  console.error = (entry) => logs.push(entry);
  try {
    const result = await removeImage(
      createImageRemovalPool('/media/products/invalid.jpg', transaction),
      { id: '9' },
      'request-test-id',
      '6',
      '7',
    );
    assert.equal(result, true);
  } finally {
    console.error = originalLog;
  }

  assert.equal(transaction.committed, true);
  assert.equal(logs.length, 1);
  assert.equal(JSON.parse(logs[0]).event, 'catalog.image_cleanup_failed');
});

test('failed image cleanup logs safely and rethrows the original upload error', async () => {
  const originalError = new Error('database insertion failed');
  const originalLog = console.error;
  const logs = [];
  console.error = (entry) => logs.push(entry);
  try {
    await assert.rejects(
      cleanupFailedUpload([{
        remove() {
          const error = new Error('private storage path');
          error.code = 'EACCES';
          throw error;
        },
      }], 'request-test-id', originalError),
      (error) => error === originalError,
    );
  } finally {
    console.error = originalLog;
  }

  assert.equal(logs.length, 1);
  const event = JSON.parse(logs[0]);
  assert.equal(event.event, 'catalog.image_cleanup_failed');
  assert.equal(event.requestId, 'request-test-id');
  assert.doesNotMatch(logs[0], /private storage path|database insertion failed/);
});

test('unexpected client errors are logged with a non-production stack only', () => {
  const originalError = new Error('internal detail');
  originalError.statusCode = 422;
  const request = { id: 'request-test-id', method: 'POST', path: '/test' };
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const originalLog = console.error;
  const logs = [];
  console.error = (entry) => logs.push(entry);

  try {
    errorHandler({ nodeEnv: 'development' })(originalError, request, response, () => {});
  } finally {
    console.error = originalLog;
  }

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.error.code, 'REQUEST_ERROR');
  assert.equal(logs.length, 1);
  const event = JSON.parse(logs[0]);
  assert.equal(event.event, 'http.unexpected_client_error');
  assert.equal(event.requestId, 'request-test-id');
  assert.equal(event.stack.includes('internal detail'), true);
});
