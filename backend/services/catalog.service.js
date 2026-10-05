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

async function listProducts(pool, filters) {
  const result = await catalogRepository.listPublicProducts(pool, filters);
  const imageRows = await catalogRepository.listPublicProductImages(
    pool,
    result.rows.map((product) => product.product_id),
  );

  return {
    data: attachImages(result.rows, imageRows),
    pagination: pagination(filters.page, filters.limit, result.total),
  };
}

async function getProduct(pool, identifier) {
  const product = identifier.type === 'id'
    ? await catalogRepository.getPublicProductById(pool, identifier.value)
    : await catalogRepository.getPublicProductBySlug(pool, identifier.value);

  if (!product) {
    return null;
  }

  const images = await catalogRepository.listPublicProductImages(pool, [product.product_id]);
  return attachImages([product], images)[0];
}

async function listCategories(pool, { page, limit }) {
  const result = await catalogRepository.listPublicCategories(pool, {
    limit,
    offset: (page - 1) * limit,
  });

  return {
    data: result.rows.map(toPublicCategory),
    pagination: pagination(page, limit, result.total),
  };
}

async function getCategory(pool, categoryId) {
  const category = await catalogRepository.getPublicCategoryById(pool, categoryId);
  return category ? toPublicCategory(category) : null;
}

module.exports = { getCategory, getProduct, listCategories, listProducts };
