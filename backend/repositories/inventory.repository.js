const columns = 'inventory_id, product_id, quantity_on_hand, quantity_reserved, created_at, updated_at';

async function createInventory(pool, {
  productId,
  quantityOnHand = 0,
  quantityReserved = 0,
}) {
  await pool.execute(
    'INSERT INTO inventory (product_id, quantity_on_hand, quantity_reserved) VALUES (?, ?, ?)',
    [productId, quantityOnHand, quantityReserved],
  );
  return getInventoryByProductId(pool, productId);
}

async function getInventoryByProductId(pool, productId) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM inventory WHERE product_id = ?`,
    [productId],
  );
  return rows[0] || null;
}

async function updateInventory(pool, productId, {
  quantityOnHand,
  quantityReserved,
}) {
  await pool.execute(
    'UPDATE inventory SET quantity_on_hand = ?, quantity_reserved = ? WHERE product_id = ?',
    [quantityOnHand, quantityReserved, productId],
  );
  return getInventoryByProductId(pool, productId);
}

module.exports = { createInventory, getInventoryByProductId, updateInventory };
