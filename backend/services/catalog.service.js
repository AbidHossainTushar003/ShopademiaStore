const catalogRepository = require('../repositories/catalog.repository');

function pagination(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

function attachImages(products, imageRows) {
  const imagesByProduct = new Map(products.map((product) => [String(product.product_id), []]));

  for (const image of imageRows) {
    imagesByProduct.get(String(image.product_id))?.push({
      url: image.image_url,
      altText: image.alt_text,
      sortOrder: image.sort_order,
    });
  }

  return products.map((product) => ({
    id: product.product_id,
    category: {
      id: product.category_id,
      name: product.category_name,
      slug: product.category_slug,
    },
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceMinor: product.price_minor,
    currencyCode: product.currency_code,
    availability: product.availability,
    images: imagesByProduct.get(String(product.product_id)),
  }));
}

function toPublicCategory(category) {
  return {
    id: category.category_id,
    parentCategoryId: category.parent_category_id,
    name: category.name,
    slug: category.slug,
    description: category.description,
  };
}

async function listProducts(pool, storeId, filters) {
  const result = await catalogRepository.listPublicProducts(pool, storeId, filters);
  const imageRows = await catalogRepository.listPublicProductImages(
    pool,
    result.rows.map((product) => product.product_id),
  );

  return {
    data: attachImages(result.rows, imageRows),
    pagination: pagination(filters.page, filters.limit, result.total),
  };
}

async function getStorefrontHome(pool, storeId) {
  const [categories, products] = await Promise.all([
    listCategories(pool, storeId, { page: 1, limit: 8 }),
    listProducts(pool, storeId, {
      page: 1,
      limit: 8,
      sort: 'newest',
    }),
  ]);

  return {
    categories: categories.data,
    recentProducts: products.data,
  };
}

async function getProduct(pool, storeId, identifier) {
  const product = identifier.type === 'id'
    ? await catalogRepository.getPublicProductById(pool, storeId, identifier.value)
    : await catalogRepository.getPublicProductBySlug(pool, storeId, identifier.value);

  if (!product) {
    return null;
  }

  const images = await catalogRepository.listPublicProductImages(pool, [product.product_id]);
  return attachImages([product], images)[0];
}

async function listCategories(pool, storeId, { page, limit }) {
  const result = await catalogRepository.listPublicCategories(pool, storeId, {
    limit,
    offset: (page - 1) * limit,
  });

  return {
    data: result.rows.map(toPublicCategory),
    pagination: pagination(page, limit, result.total),
  };
}

async function getCategory(pool, storeId, categoryId) {
  const category = await catalogRepository.getPublicCategoryById(pool, storeId, categoryId);
  return category ? toPublicCategory(category) : null;
}

module.exports = {
  getCategory,
  getProduct,
  getStorefrontHome,
  listCategories,
  listProducts,
};
