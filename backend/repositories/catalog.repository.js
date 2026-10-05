const productSortSql = Object.freeze({
  newest: 'p.created_at DESC, p.product_id DESC',
  price_asc: 'p.price_minor ASC, p.product_id ASC',
  price_desc: 'p.price_minor DESC, p.product_id DESC',
  name_asc: 'p.name ASC, p.product_id ASC',
  name_desc: 'p.name DESC, p.product_id DESC',
});

const productColumns = `p.product_id, p.category_id, c.name AS category_name, c.slug AS category_slug,
  p.name, p.slug, p.description, p.price_minor, p.currency_code,
  CASE
    WHEN COALESCE(i.quantity_on_hand, 0) > COALESCE(i.quantity_reserved, 0)
    THEN 'in_stock'
    ELSE 'out_of_stock'
  END AS availability`;
const categoryColumns = 'category_id, parent_category_id, name, slug, description';

function escapeLike(value) {
  return value.replace(/[!%_]/g, '!$&');
}

function buildProductConditions(filters, storeId) {
  const conditions = [
    'sp.store_id = ?',
    "sp.visibility = 'visible'",
    "p.status = 'active'",
    'p.deleted_at IS NULL',
    "c.status = 'active'",
    'c.deleted_at IS NULL',
  ];
  const parameters = [storeId];

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

async function listPublicProducts(pool, storeId, filters) {
  const { conditions, parameters } = buildProductConditions(filters, storeId);
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM products p
     INNER JOIN store_products sp ON sp.product_id = p.product_id
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
    INNER JOIN store_products sp ON sp.product_id = p.product_id
    INNER JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN inventory i ON i.product_id = p.product_id
     WHERE ${conditions}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...parameters, filters.limit, (filters.page - 1) * filters.limit],
  );

  return { rows, total: Number(countRows[0].total) };
}

async function getPublicProductById(pool, storeId, productId) {
  const [rows] = await pool.execute(
    `SELECT ${productColumns}
     FROM products p
     INNER JOIN store_products sp
       ON sp.product_id = p.product_id
      AND sp.store_id = ?
      AND sp.visibility = 'visible'
     INNER JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN inventory i ON i.product_id = p.product_id
     WHERE p.product_id = ?
       AND p.status = 'active'
       AND p.deleted_at IS NULL
       AND c.status = 'active'
       AND c.deleted_at IS NULL`,
    [storeId, productId],
  );
  return rows[0] || null;
}

async function getPublicProductBySlug(pool, storeId, slug) {
  const [rows] = await pool.execute(
    `SELECT ${productColumns}
     FROM products p
     INNER JOIN store_products sp
       ON sp.product_id = p.product_id
      AND sp.store_id = ?
      AND sp.visibility = 'visible'
     INNER JOIN categories c ON c.category_id = p.category_id
     LEFT JOIN inventory i ON i.product_id = p.product_id
     WHERE p.slug = ?
       AND p.status = 'active'
       AND p.deleted_at IS NULL
       AND c.status = 'active'
       AND c.deleted_at IS NULL`,
    [storeId, slug],
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

async function listPublicCategories(pool, storeId, { limit, offset }) {
  const visibleCategory = `EXISTS (
    SELECT 1
    FROM store_products sp
    INNER JOIN products p ON p.product_id = sp.product_id
    WHERE sp.store_id = ?
      AND sp.visibility = 'visible'
      AND p.category_id = categories.category_id
      AND p.status = 'active'
      AND p.deleted_at IS NULL
  )`;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM categories
     WHERE status = 'active' AND deleted_at IS NULL AND ${visibleCategory}`,
    [storeId],
  );
  const [rows] = await pool.execute(
    `SELECT ${categoryColumns} FROM categories
     WHERE status = 'active' AND deleted_at IS NULL AND ${visibleCategory}
     ORDER BY sort_order, category_id
     LIMIT ? OFFSET ?`,
    [storeId, limit, offset],
  );
  return { rows, total: Number(countRows[0].total) };
}

async function getPublicCategoryById(pool, storeId, categoryId) {
  const [rows] = await pool.execute(
    `SELECT ${categoryColumns} FROM categories
     WHERE category_id = ? AND status = 'active' AND deleted_at IS NULL
       AND EXISTS (
         SELECT 1
         FROM store_products sp
         INNER JOIN products p ON p.product_id = sp.product_id
         WHERE sp.store_id = ?
           AND sp.visibility = 'visible'
           AND p.category_id = categories.category_id
           AND p.status = 'active'
           AND p.deleted_at IS NULL
       )`,
    [categoryId, storeId],
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
