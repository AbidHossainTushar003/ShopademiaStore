const columns = 'category_id, parent_category_id, name, slug, description, sort_order, status, deleted_at, created_at, updated_at';

async function createCategory(pool, {
  parentCategoryId = null,
  name,
  slug,
  description = null,
  sortOrder = 0,
  status = 'active',
}) {
  const [result] = await pool.execute(
    'INSERT INTO categories (parent_category_id, name, slug, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
    [parentCategoryId, name, slug, description, sortOrder, status],
  );
  return getCategoryById(pool, result.insertId);
}

async function getCategoryById(pool, categoryId) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM categories WHERE category_id = ? AND deleted_at IS NULL`,
    [categoryId],
  );
  return rows[0] || null;
}

async function getCategoryBySlug(pool, slug) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM categories WHERE slug = ? AND deleted_at IS NULL`,
    [slug],
  );
  return rows[0] || null;
}

async function listCategories(pool, { status = null, limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM categories
     WHERE deleted_at IS NULL AND (? IS NULL OR status = ?)
     ORDER BY sort_order, category_id LIMIT ? OFFSET ?`,
    [status, status, limit, offset],
  );
  return rows;
}

async function updateCategory(pool, categoryId, {
  parentCategoryId,
  name,
  slug,
  description,
  sortOrder,
  status,
}) {
  await pool.execute(
    'UPDATE categories SET parent_category_id = ?, name = ?, slug = ?, description = ?, sort_order = ?, status = ? WHERE category_id = ? AND deleted_at IS NULL',
    [parentCategoryId, name, slug, description, sortOrder, status, categoryId],
  );
  return getCategoryById(pool, categoryId);
}

async function softDeleteCategory(pool, categoryId) {
  const [result] = await pool.execute(
    "UPDATE categories SET status = 'inactive', deleted_at = CURRENT_TIMESTAMP WHERE category_id = ? AND deleted_at IS NULL",
    [categoryId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createCategory,
  getCategoryById,
  getCategoryBySlug,
  listCategories,
  softDeleteCategory,
  updateCategory,
};
