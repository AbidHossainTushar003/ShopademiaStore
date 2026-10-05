const columns = 'product_image_id, product_id, image_url, alt_text, sort_order, status, deleted_at, created_at, updated_at';

async function createProductImage(pool, {
  productId,
  imageUrl,
  altText = null,
  sortOrder = 0,
  status = 'active',
}) {
  const [result] = await pool.execute(
    'INSERT INTO product_images (product_id, image_url, alt_text, sort_order, status) VALUES (?, ?, ?, ?, ?)',
    [productId, imageUrl, altText, sortOrder, status],
  );
  return getProductImageById(pool, result.insertId);
}

async function getProductImageById(pool, productImageId) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM product_images WHERE product_image_id = ? AND deleted_at IS NULL`,
    [productImageId],
  );
  return rows[0] || null;
}

async function listProductImages(pool, productId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM product_images
     WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY sort_order, product_image_id LIMIT ? OFFSET ?`,
    [productId, limit, offset],
  );
  return rows;
}

async function updateProductImage(pool, productImageId, {
  imageUrl,
  altText,
  sortOrder,
  status,
}) {
  await pool.execute(
    'UPDATE product_images SET image_url = ?, alt_text = ?, sort_order = ?, status = ? WHERE product_image_id = ? AND deleted_at IS NULL',
    [imageUrl, altText, sortOrder, status, productImageId],
  );
  return getProductImageById(pool, productImageId);
}

async function softDeleteProductImage(pool, productImageId) {
  const [result] = await pool.execute(
    "UPDATE product_images SET status = 'inactive', deleted_at = CURRENT_TIMESTAMP WHERE product_image_id = ? AND deleted_at IS NULL",
    [productImageId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createProductImage,
  getProductImageById,
  listProductImages,
  softDeleteProductImage,
  updateProductImage,
};
