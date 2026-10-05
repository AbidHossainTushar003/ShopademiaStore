const productColumns = `product_id, category_id, sku, name, slug, description,
  price_minor, currency_code, status, deleted_at, created_at, updated_at`;
const categoryColumns = `category_id, parent_category_id, name, slug, description,
  sort_order, status, deleted_at, created_at, updated_at`;

async function listAdminProducts(connection, { page, limit, status }) {
  const where = status ? 'WHERE status = ?' : '';
  const parameters = status ? [status] : [];
  const [countRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM products ${where}`,
    parameters,
  );
  const [rows] = await connection.execute(
    `SELECT ${productColumns} FROM products ${where}
     ORDER BY product_id DESC LIMIT ? OFFSET ?`,
    [...parameters, limit, (page - 1) * limit],
  );
  return { rows, total: Number(countRows[0].total) };
}

async function getAdminProduct(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT ${productColumns} FROM products WHERE product_id = ?`,
    [productId],
  );
  if (!rows[0]) {
    return null;
  }

  const [images] = await connection.execute(
    `SELECT product_image_id, image_url, alt_text, sort_order, status, deleted_at
     FROM product_images WHERE product_id = ? ORDER BY sort_order, product_image_id`,
    [productId],
  );
  const [inventoryRows] = await connection.execute(
    `SELECT quantity_on_hand, quantity_reserved
     FROM inventory WHERE product_id = ?`,
    [productId],
  );

  return { ...rows[0], images, inventory: inventoryRows[0] || null };
}

async function insertProduct(connection, product) {
  const [result] = await connection.execute(
    `INSERT INTO products
      (category_id, sku, name, slug, description, price_minor, currency_code, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.categoryId,
      product.sku,
      product.name,
      product.slug,
      product.description,
      product.priceMinor,
      product.currencyCode,
      product.status,
    ],
  );
  return result.insertId;
}

async function updateProduct(connection, productId, product) {
  await connection.execute(
    `UPDATE products
     SET category_id = ?, sku = ?, name = ?, slug = ?, description = ?,
         price_minor = ?, currency_code = ?
     WHERE product_id = ? AND deleted_at IS NULL`,
    [
      product.categoryId,
      product.sku,
      product.name,
      product.slug,
      product.description,
      product.priceMinor,
      product.currencyCode,
      productId,
    ],
  );
}

async function updateProductStatus(connection, productId, status) {
  const [result] = await connection.execute(
    'UPDATE products SET status = ? WHERE product_id = ? AND deleted_at IS NULL',
    [status, productId],
  );
  return result.affectedRows > 0;
}

async function getAdminCategory(connection, categoryId) {
  const [rows] = await connection.execute(
    `SELECT ${categoryColumns} FROM categories WHERE category_id = ?`,
    [categoryId],
  );
  return rows[0] || null;
}

async function getAdminCategoryForUpdate(connection, categoryId) {
  const [rows] = await connection.execute(
    `SELECT ${categoryColumns} FROM categories WHERE category_id = ? FOR UPDATE`,
    [categoryId],
  );
  return rows[0] || null;
}

async function getAdminCategoryBySlug(connection, slug) {
  const [rows] = await connection.execute(
    `SELECT ${categoryColumns} FROM categories WHERE slug = ?`,
    [slug],
  );
  return rows[0] || null;
}

async function listAdminCategories(connection, { page, limit, status }) {
  const where = status ? 'WHERE status = ?' : '';
  const parameters = status ? [status] : [];
  const [countRows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM categories ${where}`,
    parameters,
  );
  const [rows] = await connection.execute(
    `SELECT ${categoryColumns} FROM categories ${where}
     ORDER BY sort_order, category_id LIMIT ? OFFSET ?`,
    [...parameters, limit, (page - 1) * limit],
  );
  return { rows, total: Number(countRows[0].total) };
}

async function insertCategory(connection, category) {
  const [result] = await connection.execute(
    `INSERT INTO categories
      (parent_category_id, name, slug, description, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      category.parentCategoryId,
      category.name,
      category.slug,
      category.description,
      category.sortOrder,
      category.status,
    ],
  );
  return result.insertId;
}

async function updateCategory(connection, categoryId, category) {
  await connection.execute(
    `UPDATE categories
     SET parent_category_id = ?, name = ?, slug = ?, description = ?, sort_order = ?
     WHERE category_id = ? AND deleted_at IS NULL`,
    [
      category.parentCategoryId,
      category.name,
      category.slug,
      category.description,
      category.sortOrder,
      categoryId,
    ],
  );
}

async function updateCategoryStatus(connection, categoryId, status) {
  const [result] = await connection.execute(
    'UPDATE categories SET status = ? WHERE category_id = ? AND deleted_at IS NULL',
    [status, categoryId],
  );
  return result.affectedRows > 0;
}

async function countCategoryReferences(connection, categoryId) {
  const [productRows] = await connection.execute(
    'SELECT COUNT(*) AS total FROM products WHERE category_id = ?',
    [categoryId],
  );
  const [childRows] = await connection.execute(
    'SELECT COUNT(*) AS total FROM categories WHERE parent_category_id = ? AND deleted_at IS NULL',
    [categoryId],
  );
  return {
    products: Number(productRows[0].total),
    children: Number(childRows[0].total),
  };
}

async function isCategoryDescendant(connection, categoryId, possibleDescendantId) {
  const [rows] = await connection.execute(
    `WITH RECURSIVE category_tree AS (
       SELECT category_id, parent_category_id
       FROM categories
       WHERE category_id = ?
       UNION ALL
       SELECT child.category_id, child.parent_category_id
       FROM categories child
       INNER JOIN category_tree parent ON child.parent_category_id = parent.category_id
     )
     SELECT 1 AS found FROM category_tree WHERE category_id = ? LIMIT 1`,
    [categoryId, possibleDescendantId],
  );
  return rows.length > 0;
}

async function deactivateCategory(connection, categoryId) {
  const [result] = await connection.execute(
    `UPDATE categories
     SET status = 'inactive', deleted_at = CURRENT_TIMESTAMP
     WHERE category_id = ? AND deleted_at IS NULL`,
    [categoryId],
  );
  return result.affectedRows > 0;
}

async function createInventory(connection, productId, { quantityOnHand = '0', quantityReserved = '0' } = {}) {
  await connection.execute(
    'INSERT INTO inventory (product_id, quantity_on_hand, quantity_reserved) VALUES (?, ?, ?)',
    [productId, quantityOnHand, quantityReserved],
  );
}

async function getInventoryForUpdate(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT quantity_on_hand, quantity_reserved
     FROM inventory WHERE product_id = ? FOR UPDATE`,
    [productId],
  );
  return rows[0] || null;
}

async function insertEmptyInventory(connection, productId) {
  await connection.execute(
    'INSERT IGNORE INTO inventory (product_id, quantity_on_hand, quantity_reserved) VALUES (?, 0, 0)',
    [productId],
  );
}

async function updateInventoryQuantities(connection, productId, quantityOnHand) {
  await connection.execute(
    'UPDATE inventory SET quantity_on_hand = ? WHERE product_id = ?',
    [quantityOnHand, productId],
  );
}

async function getProductImageCount(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM product_images
     WHERE product_id = ? AND status = 'active' AND deleted_at IS NULL`,
    [productId],
  );
  return Number(rows[0].total);
}

async function insertProductImage(connection, productId, { imageUrl, altText, sortOrder }) {
  const [result] = await connection.execute(
    `INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
     VALUES (?, ?, ?, ?)`,
    [productId, imageUrl, altText, sortOrder],
  );
  return result.insertId;
}

async function getProductImage(connection, productId, imageId) {
  const [rows] = await connection.execute(
    `SELECT product_image_id, product_id, image_url, alt_text, sort_order, status, deleted_at
     FROM product_images
     WHERE product_id = ? AND product_image_id = ? AND deleted_at IS NULL`,
    [productId, imageId],
  );
  return rows[0] || null;
}

async function listProductImages(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT product_image_id, product_id, image_url, alt_text, sort_order, status, deleted_at
     FROM product_images WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY sort_order, product_image_id`,
    [productId],
  );
  return rows;
}

async function shiftProductImages(connection, productId) {
  await connection.execute(
    `UPDATE product_images SET sort_order = sort_order + 1
     WHERE product_id = ? AND status = 'active' AND deleted_at IS NULL`,
    [productId],
  );
}

async function updateProductImage(connection, productId, imageId, { altText, sortOrder }) {
  await connection.execute(
    `UPDATE product_images SET alt_text = ?, sort_order = ?
     WHERE product_id = ? AND product_image_id = ? AND deleted_at IS NULL`,
    [altText, sortOrder, productId, imageId],
  );
}

async function getProductImageForUpdate(connection, productId, imageId) {
  const [rows] = await connection.execute(
    `SELECT product_image_id, product_id, image_url, alt_text, sort_order, status, deleted_at
     FROM product_images
     WHERE product_id = ? AND product_image_id = ? AND deleted_at IS NULL
     FOR UPDATE`,
    [productId, imageId],
  );
  return rows[0] || null;
}

async function deactivateProductImage(connection, productId, imageId) {
  const [result] = await connection.execute(
    `UPDATE product_images SET status = 'inactive', deleted_at = CURRENT_TIMESTAMP
     WHERE product_id = ? AND product_image_id = ? AND deleted_at IS NULL`,
    [productId, imageId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  countCategoryReferences,
  createInventory,
  deactivateCategory,
  deactivateProductImage,
  getAdminCategory,
  getAdminCategoryBySlug,
  getAdminCategoryForUpdate,
  getAdminProduct,
  getInventoryForUpdate,
  getProductImage,
  getProductImageCount,
  getProductImageForUpdate,
  insertCategory,
  insertEmptyInventory,
  insertProduct,
  insertProductImage,
  isCategoryDescendant,
  listAdminCategories,
  listAdminProducts,
  listProductImages,
  shiftProductImages,
  updateCategory,
  updateCategoryStatus,
  updateInventoryQuantities,
  updateProduct,
  updateProductImage,
  updateProductStatus,
};
