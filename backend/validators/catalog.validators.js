const allowedProductSorts = new Set([
  'newest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
]);

class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.publicCode = statusCode === 422 ? 'VALIDATION_FAILED' : 'INVALID_REQUEST';
    this.publicMessage = message;
  }
}

function singleQueryValue(query, key) {
  const value = query[key];

  if (Array.isArray(value) || (value !== undefined && typeof value !== 'string')) {
    throw new ValidationError(`Query parameter "${key}" must be provided once.`);
  }

  return value;
}

function parsePositiveInteger(value, name, { maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!/^[1-9]\d*$/.test(value || '')) {
    throw new ValidationError(`"${name}" must be a positive integer.`);
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number > maximum) {
    throw new ValidationError(`"${name}" is outside the supported range.`);
  }

  return number;
}

function parsePrice(value, name) {
  if (!/^(0|[1-9]\d*)$/.test(value || '')) {
    throw new ValidationError(`"${name}" must be a non-negative integer in minor currency units.`);
  }

  if (BigInt(value) > 18446744073709551615n) {
    throw new ValidationError(`"${name}" is outside the supported range.`);
  }

  return value;
}

function parseDatabaseId(value, name) {
  if (!/^[1-9]\d*$/.test(value || '') || BigInt(value) > 18446744073709551615n) {
    throw new ValidationError(`"${name}" must be a valid positive ID.`);
  }

  return value;
}

function validateQueryKeys(query, allowedKeys) {
  for (const key of Object.keys(query)) {
    if (!allowedKeys.has(key)) {
      throw new ValidationError(`Unknown query parameter "${key}".`);
    }
  }
}

function validateProductListQuery(query) {
  validateQueryKeys(query, new Set([
    'page',
    'limit',
    'q',
    'category',
    'minPrice',
    'maxPrice',
    'sort',
  ]));

  const pageValue = singleQueryValue(query, 'page');
  const limitValue = singleQueryValue(query, 'limit');
  const search = singleQueryValue(query, 'q');
  const categoryValue = singleQueryValue(query, 'category');
  const minPriceValue = singleQueryValue(query, 'minPrice');
  const maxPriceValue = singleQueryValue(query, 'maxPrice');
  const sortValue = singleQueryValue(query, 'sort');

  if (search !== undefined && (search.length === 0 || search.length > 100)) {
    throw new ValidationError('"q" must contain between 1 and 100 characters.', 422);
  }

  const minPrice = minPriceValue === undefined ? undefined : parsePrice(minPriceValue, 'minPrice');
  const maxPrice = maxPriceValue === undefined ? undefined : parsePrice(maxPriceValue, 'maxPrice');

  if (minPrice !== undefined && maxPrice !== undefined && BigInt(minPrice) > BigInt(maxPrice)) {
    throw new ValidationError('"minPrice" must not exceed "maxPrice".', 422);
  }

  if (sortValue !== undefined && !allowedProductSorts.has(sortValue)) {
    throw new ValidationError('"sort" must be one of: newest, price_asc, price_desc, name_asc, name_desc.');
  }

  return {
    page: pageValue === undefined ? 1 : parsePositiveInteger(pageValue, 'page', { maximum: 1000000 }),
    limit: limitValue === undefined ? 20 : parsePositiveInteger(limitValue, 'limit', { maximum: 100 }),
    search,
    categoryId: categoryValue === undefined
      ? undefined
      : parseDatabaseId(categoryValue, 'category'),
    minPrice,
    maxPrice,
    sort: sortValue || 'newest',
  };
}

function validateCategoryListQuery(query) {
  validateQueryKeys(query, new Set(['page', 'limit']));

  const pageValue = singleQueryValue(query, 'page');
  const limitValue = singleQueryValue(query, 'limit');

  return {
    page: pageValue === undefined ? 1 : parsePositiveInteger(pageValue, 'page', { maximum: 1000000 }),
    limit: limitValue === undefined ? 50 : parsePositiveInteger(limitValue, 'limit', { maximum: 100 }),
  };
}

function validateProductIdentifier(value) {
  if (/^\d+$/.test(value)) {
    return { type: 'id', value: parseDatabaseId(value, 'product identifier') };
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(value)) {
    throw new ValidationError('Product identifier must be a positive ID or a valid slug.');
  }

  return { type: 'slug', value };
}

function validateCategoryId(value) {
  return parseDatabaseId(value, 'category ID');
}

module.exports = {
  ValidationError,
  validateCategoryId,
  validateCategoryListQuery,
  validateProductIdentifier,
  validateProductListQuery,
};
