const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createPool } = require('../database/pool');
const cartRepository = require('../repositories/cart.repository');
const ordersRepository = require('../repositories/orders.repository');
const ordersService = require('../services/orders.service');
const { createTestDatabaseConfig } = require('../support/database-config-guard');

const enabled = process.env.SHOPADEMIA_DB_INTEGRATION === '1';

test('MySQL integration: constraints, checkout atomicity, stock locking, customer/store isolation', {
  skip: !enabled,
}, async (context) => {
  const database = createTestDatabaseConfig(process.env);
  const pool = createPool({ ...database, poolSize: 5 });
  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const seeded = {};

  async function createCustomer(label) {
    const [result] = await pool.execute(
      `INSERT INTO customers (email, display_name, password_hash)
       VALUES (?, ?, ?)`,
      [`phase14-${suffix}-${label}@example.invalid`, `Phase 14 ${label}`, 'test-only-not-a-password-hash'],
    );
    return result.insertId;
  }

  async function createPurchasableProduct(stock, label) {
    const [categoryResult] = await pool.execute(
      `INSERT INTO categories (name, slug, status)
       VALUES (?, ?, 'active')`,
      [`Phase 14 ${label}`, `phase14-${suffix}-${label}`],
    );
    const [productResult] = await pool.execute(
      `INSERT INTO products
         (category_id, sku, name, slug, price_minor, currency_code, status)
       VALUES (?, ?, ?, ?, 1250, 'USD', 'active')`,
      [
        categoryResult.insertId,
        `P14-${suffix}-${label}`,
        `Phase 14 ${label}`,
        `phase14-${suffix}-${label}`,
      ],
    );
    await pool.execute(
      'INSERT INTO inventory (product_id, quantity_on_hand, quantity_reserved) VALUES (?, ?, 0)',
      [productResult.insertId, stock],
    );
    await pool.execute(
      `INSERT INTO store_products (store_id, product_id, visibility)
       VALUES (1, ?, 'visible')`,
      [productResult.insertId],
    );
    await pool.execute(
      `INSERT INTO store_products (store_id, product_id, visibility)
       VALUES (?, ?, 'visible')`,
      [seeded.secondStoreId, productResult.insertId],
    );
    return productResult.insertId;
  }

  async function createCartItem(customerId, productId, storeId = 1) {
    const [cartResult] = await pool.execute(
      'INSERT INTO carts (customer_id, store_id) VALUES (?, ?)',
      [customerId, storeId],
    );
    await pool.execute(
      `INSERT INTO cart_items
         (cart_id, product_id, quantity, added_price_minor, added_currency_code)
       VALUES (?, ?, 1, 1250, 'USD')`,
      [cartResult.insertId, productId],
    );
    return cartResult.insertId;
  }

  try {
    const [storeResult] = await pool.execute(
      `INSERT INTO stores (name, slug, status, allowed_origins)
       VALUES (?, ?, 'active', JSON_ARRAY())`,
      [`Phase 14 ${suffix}`, `phase14-${suffix}`],
    );
    seeded.secondStoreId = storeResult.insertId;

    seeded.customers = await Promise.all([
      createCustomer('stock-a'),
      createCustomer('stock-b'),
      createCustomer('rollback'),
      createCustomer('unrelated'),
    ]);
    [seeded.stockProductId, seeded.rollbackProductId] = await Promise.all([
      createPurchasableProduct(1, 'last-unit'),
      createPurchasableProduct(1, 'rollback-unit'),
    ]);
    const [, , , otherStoreCartId] = await Promise.all([
      createCartItem(seeded.customers[0], seeded.stockProductId),
      createCartItem(seeded.customers[1], seeded.stockProductId),
      createCartItem(seeded.customers[2], seeded.rollbackProductId),
      createCartItem(seeded.customers[0], seeded.rollbackProductId, seeded.secondStoreId),
    ]);
    seeded.otherStoreCartId = otherStoreCartId;

    await context.test('foreign keys, unique keys, and CHECK constraints reject invalid rows', async () => {
      await assert.rejects(
        pool.execute(
          `INSERT INTO customers (email, display_name, password_hash)
           VALUES (?, 'Duplicate', 'unused')`,
          [`phase14-${suffix}-stock-a@example.invalid`],
        ),
        (error) => error.code === 'ER_DUP_ENTRY',
      );
      await assert.rejects(
        pool.execute(
          `INSERT INTO cart_items
             (cart_id, product_id, quantity, added_price_minor, added_currency_code)
           VALUES (999999999, 999999999, 1, 1, 'USD')`,
        ),
        (error) => ['ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW'].includes(error.code),
      );
      await assert.rejects(
        pool.execute(
          'UPDATE inventory SET quantity_reserved = quantity_on_hand + 1 WHERE product_id = ?',
          [seeded.stockProductId],
        ),
        (error) => error.code === 'ER_CHECK_CONSTRAINT_VIOLATED',
      );
    });

    await context.test('checkout rolls back order, payment, cart, and stock changes on failure', async () => {
      const failedPool = {
        async getConnection() {
          const connection = await pool.getConnection();
          return {
            beginTransaction: (...args) => connection.beginTransaction(...args),
            commit: (...args) => connection.commit(...args),
            rollback: (...args) => connection.rollback(...args),
            release: () => connection.release(),
            execute(sql, parameters) {
              if (sql.startsWith('INSERT INTO payments')) {
                throw new Error('Injected test-only payment insert failure');
              }
              return connection.execute(sql, parameters);
            },
          };
        },
      };
      await assert.rejects(
        ordersService.checkout(
          failedPool,
          seeded.customers[2],
          1,
          `phase14-rollback-${suffix}`,
          { address: 'test-only' },
        ),
        /Injected test-only payment insert failure/,
      );
      const [orders] = await pool.execute(
        'SELECT COUNT(*) AS total FROM orders WHERE customer_id = ? AND store_id = 1',
        [seeded.customers[2]],
      );
      const [inventory] = await pool.execute(
        'SELECT quantity_on_hand FROM inventory WHERE product_id = ?',
        [seeded.rollbackProductId],
      );
      const connection = await pool.getConnection();
      try {
        const cart = await cartRepository.getCartForUpdate(connection, seeded.customers[2], 1);
        const items = await cartRepository.listCartItems(connection, cart.cart_id, 1);
        assert.equal(Number(orders[0].total), 0);
        assert.equal(String(inventory[0].quantity_on_hand), '1');
        assert.equal(items.length, 1);
      } finally {
        connection.release();
      }
    });

    await context.test('concurrent checkouts cannot oversell the final unit', async () => {
      const outcomes = await Promise.allSettled([
        ordersService.checkout(
          pool,
          seeded.customers[0],
          1,
          `phase14-stock-a-${suffix}`,
          { address: 'test-only' },
        ),
        ordersService.checkout(
          pool,
          seeded.customers[1],
          1,
          `phase14-stock-b-${suffix}`,
          { address: 'test-only' },
        ),
      ]);
      const successful = outcomes.filter((outcome) => outcome.status === 'fulfilled');
      const failed = outcomes.filter((outcome) => outcome.status === 'rejected');
      assert.equal(successful.length, 1);
      assert.equal(failed.length, 1);
      seeded.winningOrderId = successful[0].value.order.id;

      const [inventory] = await pool.execute(
        'SELECT quantity_on_hand FROM inventory WHERE product_id = ?',
        [seeded.stockProductId],
      );
      const [orders] = await pool.execute(
        'SELECT COUNT(*) AS total FROM orders WHERE order_id = ?',
        [seeded.winningOrderId],
      );
      assert.equal(String(inventory[0].quantity_on_hand), '0');
      assert.equal(Number(orders[0].total), 1);
    });

    await context.test('orders cannot be read by another customer or store', async () => {
      const [otherCustomerOrder, otherStoreOrder] = await Promise.all([
        ordersService.getCustomerOrder(
          pool,
          seeded.customers[3],
          1,
          seeded.winningOrderId,
        ),
        ordersService.getCustomerOrder(
          pool,
          seeded.customers[0],
          seeded.secondStoreId,
          seeded.winningOrderId,
        ),
      ]);
      assert.equal(otherCustomerOrder, null);
      assert.equal(otherStoreOrder, null);

      const connection = await pool.getConnection();
      try {
        const visibleInOtherStore = await ordersRepository.getOrderById(
          connection,
          seeded.winningOrderId,
          seeded.customers[0],
          seeded.secondStoreId,
        );
        assert.equal(visibleInOtherStore, null);

        const [storeCartItems] = await connection.execute(
          'SELECT cart_item_id FROM cart_items WHERE cart_id = ?',
          [seeded.otherStoreCartId],
        );
        assert.equal(
          await cartRepository.getOwnedCartItemForUpdate(
            connection,
            seeded.customers[0],
            1,
            storeCartItems[0].cart_item_id,
          ),
          null,
        );
        assert.equal(
          await cartRepository.getOwnedCartItemForUpdate(
            connection,
            seeded.customers[3],
            seeded.secondStoreId,
            storeCartItems[0].cart_item_id,
          ),
          null,
        );
      } finally {
        connection.release();
      }
    });
  } finally {
    await pool.end();
  }
});
