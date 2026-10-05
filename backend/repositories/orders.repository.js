const orderColumns = `o.order_id, o.customer_id, o.customer_email_snapshot,
  o.customer_name_snapshot, o.order_number, o.currency_code,
  o.subtotal_minor, o.total_minor, o.shipping_snapshot, o.order_status,
  o.created_at, o.updated_at, pay.payment_id, pay.payment_status`;

async function getCustomerCartForUpdate(connection, customerId, storeId) {
  const [rows] = await connection.execute(
    'SELECT cart_id FROM carts WHERE customer_id = ? AND store_id = ? FOR UPDATE',
    [customerId, storeId],
  );
  return rows[0] || null;
}

async function getCustomerSnapshotForUpdate(connection, customerId) {
  const [rows] = await connection.execute(
    `SELECT email, display_name
     FROM customers
     WHERE customer_id = ? AND status = 'active' AND deleted_at IS NULL
     FOR UPDATE`,
    [customerId],
  );
  return rows[0] || null;
}

async function listCheckoutCartItemsForUpdate(connection, cartId) {
  const [rows] = await connection.execute(
    `SELECT cart_item_id, product_id, quantity
     FROM cart_items
     WHERE cart_id = ?
     ORDER BY product_id
     FOR UPDATE`,
    [cartId],
  );
  return rows;
}

async function getCheckoutProductForUpdate(connection, productId, storeId) {
  const [rows] = await connection.execute(
    `SELECT
       p.product_id, p.name, p.sku, p.price_minor, p.currency_code,
       p.status AS product_status, p.deleted_at AS product_deleted_at,
       c.status AS category_status, c.deleted_at AS category_deleted_at,
       i.quantity_on_hand, i.quantity_reserved
     FROM products p
     INNER JOIN store_products sp
       ON sp.product_id = p.product_id
      AND sp.store_id = ?
      AND sp.visibility = 'visible'
     INNER JOIN categories c ON c.category_id = p.category_id
     INNER JOIN inventory i ON i.product_id = p.product_id
     WHERE p.product_id = ?
     FOR UPDATE`,
    [storeId, productId],
  );
  return rows[0] || null;
}

async function decrementInventory(connection, productId, quantity) {
  const [result] = await connection.execute(
    `UPDATE inventory
     SET quantity_on_hand = quantity_on_hand - ?
     WHERE product_id = ?
       AND quantity_on_hand >= quantity_reserved
       AND quantity_on_hand - quantity_reserved >= ?`,
    [quantity, productId, quantity],
  );
  return result.affectedRows === 1;
}

async function getOrderIdByIdempotencyKey(connection, customerId, storeId, idempotencyKey) {
  const [rows] = await connection.execute(
    `SELECT order_id FROM orders
     WHERE customer_id = ? AND store_id = ? AND idempotency_key = ?`,
    [customerId, storeId, idempotencyKey],
  );
  return rows[0]?.order_id || null;
}

async function createOrder(connection, {
  customerId,
  storeId,
  customerEmail,
  customerName,
  orderNumber,
  idempotencyKey,
  currencyCode,
  subtotalMinor,
  shippingSnapshot,
}) {
  const [result] = await connection.execute(
    `INSERT INTO orders
       (customer_id, store_id, customer_email_snapshot, customer_name_snapshot,
        order_number, idempotency_key, currency_code,
        subtotal_minor, total_minor, shipping_snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      storeId,
      customerEmail,
      customerName,
      orderNumber,
      idempotencyKey,
      currencyCode,
      subtotalMinor,
      subtotalMinor,
      JSON.stringify(shippingSnapshot),
    ],
  );
  return result.insertId;
}

async function createOrderItem(connection, orderId, item) {
  await connection.execute(
    `INSERT INTO order_items
       (order_id, product_id, product_name_snapshot, sku_snapshot,
        quantity, unit_price_minor, line_total_minor, currency_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      item.product_id,
      item.name,
      item.sku,
      item.quantity,
      item.price_minor,
      (BigInt(item.price_minor) * BigInt(item.quantity)).toString(),
      item.currency_code,
    ],
  );
}

async function createPayment(connection, orderId, amountMinor, currencyCode) {
  await connection.execute(
    `INSERT INTO payments (order_id, payment_status, amount_minor, currency_code)
     VALUES (?, 'pending', ?, ?)`,
    [orderId, amountMinor, currencyCode],
  );
}

async function clearCartItems(connection, cartId) {
  await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
}

async function getOrderById(connection, orderId, customerId = null, storeId = null) {
  const customerCondition = customerId === null ? '' : 'AND o.customer_id = ?';
  const storeCondition = storeId === null ? '' : 'AND o.store_id = ?';
  const parameters = [
    orderId,
    ...(customerId === null ? [] : [customerId]),
    ...(storeId === null ? [] : [storeId]),
  ];
  const [rows] = await connection.execute(
    `SELECT ${orderColumns}
     FROM orders o
     INNER JOIN payments pay ON pay.order_id = o.order_id
     WHERE o.order_id = ? ${customerCondition} ${storeCondition}`,
    parameters,
  );
  if (!rows[0]) {
    return null;
  }

  const [items] = await connection.execute(
    `SELECT order_item_id, product_id, product_name_snapshot, sku_snapshot,
            quantity, unit_price_minor, line_total_minor, currency_code
     FROM order_items WHERE order_id = ? ORDER BY order_item_id`,
    [orderId],
  );
  return { ...rows[0], items };
}

async function getOrderForUpdate(connection, orderId, storeId) {
  const [rows] = await connection.execute(
    `SELECT ${orderColumns}
     FROM orders o
     INNER JOIN payments pay ON pay.order_id = o.order_id
     WHERE o.order_id = ? AND o.store_id = ?
     FOR UPDATE`,
    [orderId, storeId],
  );
  return rows[0] || null;
}

async function listCustomerOrders(connection, customerId, storeId, { limit, offset }) {
  const [rows] = await connection.execute(
    `SELECT ${orderColumns}
     FROM orders o
     INNER JOIN payments pay ON pay.order_id = o.order_id
     WHERE o.customer_id = ? AND o.store_id = ?
     ORDER BY o.created_at DESC, o.order_id DESC
     LIMIT ? OFFSET ?`,
    [customerId, storeId, limit, offset],
  );
  const [countRows] = await connection.execute(
    'SELECT COUNT(*) AS total FROM orders WHERE customer_id = ? AND store_id = ?',
    [customerId, storeId],
  );
  return { rows, total: Number(countRows[0].total) };
}

async function listAdminOrders(connection, storeId, { limit, offset, orderStatus, paymentStatus }) {
  const conditions = ['o.store_id = ?'];
  const parameters = [storeId];
  if (orderStatus) {
    conditions.push('o.order_status = ?');
    parameters.push(orderStatus);
  }
  if (paymentStatus) {
    conditions.push('pay.payment_status = ?');
    parameters.push(paymentStatus);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await connection.execute(
    `SELECT ${orderColumns}
     FROM orders o
     INNER JOIN payments pay ON pay.order_id = o.order_id
     ${where}
     ORDER BY o.created_at DESC, o.order_id DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );
  const [countRows] = await connection.execute(
    `SELECT COUNT(*) AS total
     FROM orders o
     INNER JOIN payments pay ON pay.order_id = o.order_id
     ${where}`,
    parameters,
  );
  return { rows, total: Number(countRows[0].total) };
}

async function updateOrderStatus(connection, storeId, orderId, status) {
  await connection.execute(
    'UPDATE orders SET order_status = ? WHERE order_id = ? AND store_id = ?',
    [status, orderId, storeId],
  );
}

async function updatePaymentStatus(connection, storeId, orderId, status) {
  await connection.execute(
    `UPDATE payments pay
     INNER JOIN orders o ON o.order_id = pay.order_id
     SET pay.payment_status = ?
     WHERE pay.order_id = ? AND o.store_id = ?`,
    [status, orderId, storeId],
  );
}

async function listOrderItems(connection, orderId, storeId) {
  const [rows] = await connection.execute(
    `SELECT oi.product_id, oi.quantity
     FROM order_items oi
     INNER JOIN orders o ON o.order_id = oi.order_id
     WHERE oi.order_id = ? AND o.store_id = ?`,
    [orderId, storeId],
  );
  return rows;
}

async function restoreInventory(connection, productId, quantity) {
  await connection.execute(
    'UPDATE inventory SET quantity_on_hand = quantity_on_hand + ? WHERE product_id = ?',
    [quantity, productId],
  );
}

module.exports = {
  clearCartItems,
  createOrder,
  createOrderItem,
  createPayment,
  decrementInventory,
  getCheckoutProductForUpdate,
  getCustomerCartForUpdate,
  getCustomerSnapshotForUpdate,
  getOrderById,
  getOrderForUpdate,
  getOrderIdByIdempotencyKey,
  listAdminOrders,
  listCheckoutCartItemsForUpdate,
  listCustomerOrders,
  listOrderItems,
  restoreInventory,
  updateOrderStatus,
  updatePaymentStatus,
};
