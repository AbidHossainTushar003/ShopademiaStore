const test = require('node:test');
const assert = require('node:assert/strict');
const { getCart } = require('../services/cart.service');

test('cart totals use current prices, exact integer arithmetic, and separate currencies', async () => {
  const items = [
    {
      cart_item_id: '1',
      product_id: '101',
      product_name: 'Repriced',
      product_slug: 'repriced',
      quantity: 3,
      added_price_minor: '100',
      added_currency_code: 'USD',
      current_price_minor: '199',
      current_currency_code: 'USD',
      store_visibility: 'visible',
      product_status: 'active',
      product_deleted_at: null,
      category_status: 'active',
      category_deleted_at: null,
      quantity_on_hand: '10',
      quantity_reserved: '2',
    },
    {
      cart_item_id: '2',
      product_id: '102',
      product_name: 'Exact amount',
      product_slug: 'exact-amount',
      quantity: 2,
      added_price_minor: '30',
      added_currency_code: 'USD',
      current_price_minor: '30',
      current_currency_code: 'USD',
      store_visibility: 'visible',
      product_status: 'active',
      product_deleted_at: null,
      category_status: 'active',
      category_deleted_at: null,
      quantity_on_hand: '2',
      quantity_reserved: '0',
    },
    {
      cart_item_id: '3',
      product_id: '103',
      product_name: 'Euro item',
      product_slug: 'euro-item',
      quantity: 1,
      added_price_minor: '15',
      added_currency_code: 'EUR',
      current_price_minor: '15',
      current_currency_code: 'EUR',
      store_visibility: 'visible',
      product_status: 'active',
      product_deleted_at: null,
      category_status: 'active',
      category_deleted_at: null,
      quantity_on_hand: '1',
      quantity_reserved: '0',
    },
    {
      cart_item_id: '4',
      product_id: '104',
      product_name: null,
      product_slug: null,
      quantity: 1,
      added_price_minor: '9',
      added_currency_code: 'USD',
      current_price_minor: null,
      current_currency_code: null,
      store_visibility: 'hidden',
      product_status: 'active',
      product_deleted_at: null,
      category_status: 'active',
      category_deleted_at: null,
      quantity_on_hand: '1',
      quantity_reserved: '0',
    },
  ];
  const transaction = { begun: false, committed: false, released: false };
  const connection = {
    async beginTransaction() { transaction.begun = true; },
    async commit() { transaction.committed = true; },
    async rollback() { throw new Error('Unexpected rollback'); },
    release() { transaction.released = true; },
    async execute(sql) {
      if (sql.startsWith('INSERT INTO carts')) {
        return [{ insertId: 1 }, []];
      }
      if (sql.includes('FROM carts WHERE customer_id')) {
        return [[{ cart_id: '5' }], []];
      }
      if (sql.includes('FROM cart_items ci')) {
        return [items, []];
      }
      throw new Error(`Unexpected cart query: ${sql}`);
    },
  };
  const pool = { async getConnection() { return connection; } };

  const cart = await getCart(pool, '7', '2');

  assert.deepEqual(cart.totals, [
    { currencyCode: 'USD', subtotalMinor: '657' },
    { currencyCode: 'EUR', subtotalMinor: '15' },
  ]);
  assert.equal(cart.items[0].lineTotalMinor, '597');
  assert.equal(cart.items[0].priceChanged, true);
  assert.equal(cart.items[0].availability, 'available');
  assert.equal(cart.items[3].lineTotalMinor, null);
  assert.equal(cart.items[3].availability, 'unavailable');
  assert.deepEqual(transaction, { begun: true, committed: true, released: true });
});
