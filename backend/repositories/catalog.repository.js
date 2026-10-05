const productSortSql = Object.freeze({
  newest: 'p.created_at DESC, p.product_id DESC',
  price_asc: 'p.price_minor ASC, p.product_id ASC',
  price_desc: 'p.price_minor DESC, p.product_id DESC',
  name_asc: 'p.name ASC, p.product_id ASC',
  name_desc: 'p.name DESC, p.product_id DESC',
});

const productColumns = `p.product_id, p.category_id, c.name AS category_name, c.slug AS category_slug,
  p.name, p.slug, p.description, p.price_minor, p.currency_code`;
const categoryColumns = 'category_id, parent_category_id, name, slug, description';

function escapeLike(value) {
  return value.replace(/[!%_]/g, '!$&');
}

function buildProductConditions(filters) {
  const conditions = [
    "p.status = 'active'",
    'p.deleted_at IS NULL',
    "c.status = 'active'",
    'c.deleted_at IS NULL',
  ];
  const parameters = [];

  if (filters.categoryId !== undefined) {
    conditions.push('p.category_id = ?');
    parameters.push(filters.categoryId);
  }

  if (filters.minPrice !== undefined) {
    conditions.push('p.price_minor >= ?');
    parameters.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push('p.price_minor <= ?');
    parameters.push(filters.maxPrice);
  }

  if (filters.search !== undefined) {
    conditions.push("p.name LIKE ? ESCAPE '!'");
    parameters.push(`${escapeLike(filters.search)}%`);
  }

  return { conditions: conditions.join(' AND '), parameters };
}

async function listPublicProducts(pool, filters) {
  const { conditions, parameters } = buildProductConditions(filters);
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM products p
     INNER JOIN categories c ON c.category_id = p.category_id
     WHERE ${conditions}`,
    parameters,
  );
  const orderBy = productSortSql[filters.sort];

  if (!orderBy) {
    throw new Error('Unsupported product sort option.');
  }

  const [rows] = await pool.execute(
    `SELECT ${productColumns}
     FROM products p
     INNER JOIN categories c ON c.category_id = p.category_id
     WHERE ${conditions}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...parameters, filters.limit, (filters.page - 1) * filters.limit],
  );

  return { rows, total: Number(countRows[0].total) };
}

async function getPublicProductById(pool, productId) {
  const [rows] = await pool.execute(
    `SELECT ${productColumns}
     FROM products p
     INNER JOIN categories c ON c.category_id = p.category_id
     WHERE p.product_id = ?
       AND p.status = 'active'
       AND p.deleted_at IS NULL
       AND c.status = 'active'
       AND c.deleted_at IS NULL`,
    [productId],
  );
  return rows[0] || null;
}

async function getPublicProductBySlug(pool, slug) {
  const [rows] = await pool.execute(
    `SELECT ${productColumns}
     FROM products p
     INNER JOIN categories c ON c.category_id = p.category_id
     WHERE p.slug = ?
       AND p.status = 'active'
       AND p.deleted_at IS NULL
       AND c.status = 'active'
       AND c.deleted_at IS NULL`,
    [slug],
  );
  return rows[0] || null;
}

async function listPublicProductImages(pool, productIds) {
  if (productIds.length === 0) {
    return [];
  }

  const placeholders = productIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT product_id, image_url, alt_text, sort_order
     FROM product_images
     WHERE product_id IN (${placeholders})
       AND status = 'active'
       AND deleted_at IS NULL
     ORDER BY product_id, sort_order, product_image_id`,
    productIds,
  );
  return rows;
}

async function listPublicCategories(pool, { limit, offset }) {
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM categories WHERE status = 'active' AND deleted_at IS NULL",
  );
  const [rows] = await pool.execute(
    `SELECT ${categoryColumns} FROM categories
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY sort_order, category_id
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return { rows, total: Number(countRows[0].total) };
}

async function getPublicCategoryById(pool, categoryId) {
  const [rows] = await pool.execute(
    `SELECT ${categoryColumns} FROM categories
     WHERE category_id = ? AND status = 'active' AND deleted_at IS NULL`,
    [categoryId],
  );
  return rows[0] || null;
}

module.exports = {
  getPublicCategoryById,
  getPublicProductById,
  getPublicProductBySlug,
  listPublicCategories,
  listPublicProductImages,
  listPublicProducts,
};
