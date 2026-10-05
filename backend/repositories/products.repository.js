const columns = 'product_id, category_id, sku, name, slug, description, price_minor, currency_code, status, deleted_at, created_at, updated_at';

async function createProduct(pool, {
  categoryId,
  sku,
  name,
  slug,
  description = null,
  priceMinor,
  currencyCode,
  status = 'draft',
}) {
  const [result] = await pool.execute(
    'INSERT INTO products (category_id, sku, name, slug, description, price_minor, currency_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [categoryId, sku, name, slug, description, priceMinor, currencyCode, status],
  );
  return getProductById(pool, result.insertId);
}

async function getProductById(pool, productId) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM products WHERE product_id = ? AND deleted_at IS NULL`,
    [productId],
  );
  return rows[0] || null;
}

async function getProductBySlug(pool, slug) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM products WHERE slug = ? AND deleted_at IS NULL`,
    [slug],
  );
  return rows[0] || null;
}

async function listProducts(pool, {
  categoryId = null,
  status = null,
  limit = 50,
  offset = 0,
} = {}) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM products
     WHERE deleted_at IS NULL
       AND (? IS NULL OR category_id = ?)
       AND (? IS NULL OR status = ?)
     ORDER BY product_id LIMIT ? OFFSET ?`,
    [categoryId, categoryId, status, status, limit, offset],
  );
  return rows;
}

async function updateProduct(pool, productId, {
  categoryId,
  sku,
  name,
  slug,
  description,
  priceMinor,
  currencyCode,
  status,
}) {
  await pool.execute(
    'UPDATE products SET category_id = ?, sku = ?, name = ?, slug = ?, description = ?, price_minor = ?, currency_code = ?, status = ? WHERE product_id = ? AND deleted_at IS NULL',
    [categoryId, sku, name, slug, description, priceMinor, currencyCode, status, productId],
  );
  return getProductById(pool, productId);
}

async function softDeleteProduct(pool, productId) {
  const [result] = await pool.execute(
    "UPDATE products SET status = 'archived', deleted_at = CURRENT_TIMESTAMP WHERE product_id = ? AND deleted_at IS NULL",
    [productId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createProduct,
  getProductById,
  getProductBySlug,
  listProducts,
  softDeleteProduct,
  updateProduct,
};
