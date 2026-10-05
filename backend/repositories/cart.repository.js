const cartColumns = 'cart_id, customer_id, created_at, updated_at';

async function getOrCreateCart(connection, customerId, storeId) {
  await connection.execute(
    `INSERT INTO carts (customer_id, store_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE cart_id = LAST_INSERT_ID(cart_id)`,
    [customerId, storeId],
  );
  const [rows] = await connection.execute(
    `SELECT ${cartColumns} FROM carts WHERE customer_id = ? AND store_id = ?`,
    [customerId, storeId],
  );
  return rows[0] || null;
}

async function getCartForUpdate(connection, customerId, storeId) {
  const [rows] = await connection.execute(
    `SELECT ${cartColumns} FROM carts
     WHERE customer_id = ? AND store_id = ?
     FOR UPDATE`,
    [customerId, storeId],
  );
  return rows[0] || null;
}

async function listCartItems(connection, cartId, storeId) {
  const [rows] = await connection.execute(
    `SELECT
       ci.cart_item_id,
       ci.product_id,
       ci.quantity,
       ci.added_price_minor,
       ci.added_currency_code,
       CASE WHEN sp.visibility = 'visible' THEN p.name END AS product_name,
       CASE WHEN sp.visibility = 'visible' THEN p.slug END AS product_slug,
       CASE WHEN sp.visibility = 'visible' THEN p.price_minor END AS current_price_minor,
       CASE WHEN sp.visibility = 'visible' THEN p.currency_code END AS current_currency_code,
       p.status AS product_status,
       p.deleted_at AS product_deleted_at,
       sp.visibility AS store_visibility,
       c.status AS category_status,
       c.deleted_at AS category_deleted_at,
       COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
       COALESCE(i.quantity_reserved, 0) AS quantity_reserved
     FROM cart_items ci
     LEFT JOIN products p ON p.product_id = ci.product_id
     LEFT JOIN store_products sp
       ON sp.product_id = ci.product_id AND sp.store_id = ?
     LEFT JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN inventory i ON i.product_id = p.product_id
     WHERE ci.cart_id = ?
     ORDER BY ci.cart_item_id`,
    [storeId, cartId],
  );
  return rows;
}

async function getPurchasableProductForUpdate(connection, productId, storeId) {
  const [rows] = await connection.execute(
    `SELECT
       p.product_id,
       p.name,
       p.price_minor,
       p.currency_code,
       p.status AS product_status,
       p.deleted_at AS product_deleted_at,
       sp.visibility AS store_visibility,
       c.status AS category_status,
       c.deleted_at AS category_deleted_at,
       COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
       COALESCE(i.quantity_reserved, 0) AS quantity_reserved
     FROM products p
     INNER JOIN store_products sp
       ON sp.product_id = p.product_id
      AND sp.store_id = ?
      AND sp.visibility = 'visible'
     LEFT JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN inventory i ON i.product_id = p.product_id
     WHERE p.product_id = ?
     FOR UPDATE`,
    [storeId, productId],
  );
  return rows[0] || null;
}

async function addCartItem(connection, cartId, product, quantity) {
  await connection.execute(
    `INSERT INTO cart_items
       (cart_id, product_id, quantity, added_price_minor, added_currency_code)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
    [
      cartId,
      product.product_id,
      quantity,
      product.price_minor,
      product.currency_code,
      quantity,
    ],
  );
}

async function getOwnedCartItemForUpdate(connection, customerId, storeId, itemId) {
  const [rows] = await connection.execute(
    `SELECT
       ci.cart_item_id,
       ci.cart_id,
       ci.product_id,
       ci.quantity,
       ci.added_price_minor,
       ci.added_currency_code
     FROM cart_items ci
     INNER JOIN carts ca ON ca.cart_id = ci.cart_id
     WHERE ca.customer_id = ? AND ca.store_id = ? AND ci.cart_item_id = ?
     FOR UPDATE`,
    [customerId, storeId, itemId],
  );
  return rows[0] || null;
}

async function updateCartItemQuantity(connection, cartItemId, quantity) {
  await connection.execute(
    'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
    [quantity, cartItemId],
  );
}

async function removeOwnedCartItem(connection, customerId, storeId, itemId) {
  const [result] = await connection.execute(
    `DELETE ci FROM cart_items ci
     INNER JOIN carts ca ON ca.cart_id = ci.cart_id
     WHERE ca.customer_id = ? AND ca.store_id = ? AND ci.cart_item_id = ?`,
    [customerId, storeId, itemId],
  );
  return result.affectedRows > 0;
}

async function clearCart(connection, customerId, storeId) {
  await connection.execute(
    `DELETE ci FROM cart_items ci
     INNER JOIN carts ca ON ca.cart_id = ci.cart_id
     WHERE ca.customer_id = ? AND ca.store_id = ?`,
    [customerId, storeId],
  );
}

module.exports = {
  addCartItem,
  clearCart,
  getCartForUpdate,
  getOrCreateCart,
  getOwnedCartItemForUpdate,
  getPurchasableProductForUpdate,
  listCartItems,
  removeOwnedCartItem,
  updateCartItemQuantity,
};
