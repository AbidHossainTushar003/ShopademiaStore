const test = require('node:test');
const assert = require('node:assert/strict');
const { updateAdminOrderStatus } = require('../services/orders.service');

test('invalid order status transitions roll back and release the transaction', async () => {
  const transaction = { begun: false, committed: false, rolledBack: false, released: false };
  const connection = {
    async beginTransaction() { transaction.begun = true; },
    async commit() { transaction.committed = true; },
    async rollback() { transaction.rolledBack = true; },
    release() { transaction.released = true; },
    async execute(sql, parameters) {
      assert.match(sql, /WHERE o\.order_id = \? AND o\.store_id = \?/);
      assert.deepEqual(parameters, ['42', '8']);
      return [[{
        order_id: '42',
        order_number: 'SH-TEST',
        customer_id: '7',
        currency_code: 'USD',
        total_minor: '1234',
        order_status: 'pending',
        payment_status: 'pending',
      }], []];
    },
  };
  const pool = { async getConnection() { return connection; } };

  await assert.rejects(
    updateAdminOrderStatus(
      pool,
      { id: '9' },
      'request-test-id',
      '8',
      '42',
      'shipped',
    ),
    (error) => error.statusCode === 409 && error.publicCode === 'INVALID_ORDER_TRANSITION',
  );
  assert.deepEqual(transaction, {
    begun: true,
    committed: false,
    rolledBack: true,
    released: true,
  });
});
