const { ValidationError } = require('./catalog.validators');

const maximumDatabaseInteger = 18446744073709551615n;

function objectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON object is required.', 422);
  }
  return body;
}

function onlyFields(body, allowedFields) {
  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new ValidationError(`Field "${field}" is not allowed.`, 422);
    }
  }
}

function requiredString(value, field, maximumLength) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > maximumLength
  ) {
    throw new ValidationError(`"${field}" must contain 1 to ${maximumLength} characters.`, 422);
  }
  return value.trim();
}

function optionalText(value, field, maximumLength) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.length > maximumLength) {
    throw new ValidationError(`"${field}" must not exceed ${maximumLength} characters.`, 422);
  }
  return value;
}

function unsignedInteger(value, field, { allowZero = true, maximum = maximumDatabaseInteger } = {}) {
  const stringValue = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : value;

  if (
    typeof stringValue !== 'string' ||
    !(allowZero ? /^(0|[1-9]\d*)$/ : /^[1-9]\d*$/.test(stringValue))
  ) {
    throw new ValidationError(`"${field}" must be a ${allowZero ? 'non-negative' : 'positive'} integer.`, 422);
  }

  if (BigInt(stringValue) > maximum) {
    throw new ValidationError(`"${field}" is outside the supported range.`, 422);
  }

  return stringValue;
}

function parsePage(value, field, defaultValue, maximum) {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = unsignedInteger(value, field, { allowZero: false, maximum: BigInt(maximum) });
  return Number(parsed);
}

function validateProductBody(body, { partial = false } = {}) {
  objectBody(body);
  const allowed = new Set([
    'categoryId',
    'sku',
    'name',
    'slug',
    'description',
    'priceMinor',
    'currencyCode',
    ...(!partial ? ['status'] : []),
  ]);
  onlyFields(body, allowed);

  const fields = ['categoryId', 'sku', 'name', 'slug', 'description', 'priceMinor', 'currencyCode'];
  if (partial && !fields.some((field) => Object.hasOwn(body, field))) {
    throw new ValidationError('At least one product field must be provided.', 422);
  }

  const result = {};
  if (!partial || Object.hasOwn(body, 'categoryId')) {
    result.categoryId = unsignedInteger(body.categoryId, 'categoryId', { allowZero: false });
  }
  if (!partial || Object.hasOwn(body, 'sku')) {
    result.sku = requiredString(body.sku, 'sku', 64);
  }
  if (!partial || Object.hasOwn(body, 'name')) {
    result.name = requiredString(body.name, 'name', 180);
  }
  if (!partial || Object.hasOwn(body, 'slug')) {
    result.slug = requiredString(body.slug, 'slug', 200).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)) {
      throw new ValidationError('"slug" must contain lowercase letters, numbers, and single hyphens.', 422);
    }
  }
  if (!partial || Object.hasOwn(body, 'description')) {
    result.description = optionalText(body.description, 'description', 20000);
  }
  if (!partial || Object.hasOwn(body, 'priceMinor')) {
    result.priceMinor = unsignedInteger(body.priceMinor, 'priceMinor');
  }
  if (!partial || Object.hasOwn(body, 'currencyCode')) {
    result.currencyCode = requiredString(body.currencyCode, 'currencyCode', 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(result.currencyCode)) {
      throw new ValidationError('"currencyCode" must be a three-letter currency code.', 422);
    }
  }
  if (!partial) {
    result.status = body.status === undefined ? 'draft' : body.status;
    if (!['draft', 'active', 'archived'].includes(result.status)) {
      throw new ValidationError('"status" must be draft, active, or archived.', 422);
    }
  }
  return result;
}

function validateProductStatusBody(body) {
  objectBody(body);
  onlyFields(body, new Set(['status']));
  if (!['draft', 'active', 'archived'].includes(body.status)) {
    throw new ValidationError('"status" must be draft, active, or archived.', 422);
  }
  return body.status;
}

function validateCategoryBody(body, { partial = false, includeStatus = true } = {}) {
  objectBody(body);
  onlyFields(body, new Set([
    'parentCategoryId',
    'name',
    'slug',
    'description',
    'sortOrder',
    ...(!partial && includeStatus ? ['status'] : []),
  ]));

  const fields = ['parentCategoryId', 'name', 'slug', 'description', 'sortOrder'];
  if (partial && !fields.some((field) => Object.hasOwn(body, field))) {
    throw new ValidationError('At least one category field must be provided.', 422);
  }

  const result = {};
  if (!partial || Object.hasOwn(body, 'parentCategoryId')) {
    result.parentCategoryId = body.parentCategoryId === undefined || body.parentCategoryId === null
      ? null
      : unsignedInteger(body.parentCategoryId, 'parentCategoryId', { allowZero: false });
  }
  if (!partial || Object.hasOwn(body, 'name')) {
    result.name = requiredString(body.name, 'name', 120);
  }
  if (!partial || Object.hasOwn(body, 'slug')) {
    result.slug = requiredString(body.slug, 'slug', 160).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)) {
      throw new ValidationError('"slug" must contain lowercase letters, numbers, and single hyphens.', 422);
    }
  }
  if (!partial || Object.hasOwn(body, 'description')) {
    result.description = optionalText(body.description, 'description', 20000);
  }
  if (!partial || Object.hasOwn(body, 'sortOrder')) {
    result.sortOrder = body.sortOrder === undefined ? 0 : Number(
      unsignedInteger(body.sortOrder, 'sortOrder', {
        maximum: BigInt(4294967295),
      }),
    );
  }
  if (!partial && includeStatus) {
    result.status = body.status === undefined ? 'active' : body.status;
    if (!['active', 'inactive'].includes(result.status)) {
      throw new ValidationError('"status" must be active or inactive.', 422);
    }
  }
  return result;
}

function validateCategoryStatusBody(body) {
  objectBody(body);
  onlyFields(body, new Set(['status']));
  if (!['active', 'inactive'].includes(body.status)) {
    throw new ValidationError('"status" must be active or inactive.', 422);
  }
  return body.status;
}

function validateInventoryAdjustmentBody(body, { absolute = false } = {}) {
  objectBody(body);
  const field = absolute ? 'quantityOnHand' : 'quantityDelta';
  onlyFields(body, new Set([field]));
  const value = body[field];

  if (absolute) {
    return { quantityOnHand: unsignedInteger(value, field) };
  }

  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'number' && !Number.isSafeInteger(value)) ||
    !/^-?(0|[1-9]\d*)$/.test(String(value)) ||
    String(value) === '-0'
  ) {
    throw new ValidationError('"quantityDelta" must be a non-zero integer.', 422);
  }
  const parsed = BigInt(value);
  if (parsed === 0n || parsed > maximumDatabaseInteger || parsed < -maximumDatabaseInteger) {
    throw new ValidationError('"quantityDelta" is outside the supported range.', 422);
  }
  return { quantityDelta: String(parsed) };
}

function validateImageUpdateBody(body) {
  objectBody(body);
  onlyFields(body, new Set(['altText', 'sortOrder', 'isPrimary']));

  const hasAltText = Object.hasOwn(body, 'altText');
  const hasSortOrder = Object.hasOwn(body, 'sortOrder');
  const hasPrimary = Object.hasOwn(body, 'isPrimary');
  if (!hasAltText && !hasSortOrder && !hasPrimary) {
    throw new ValidationError('At least one image field must be provided.', 422);
  }
  if (hasPrimary && typeof body.isPrimary !== 'boolean') {
    throw new ValidationError('"isPrimary" must be a boolean.', 422);
  }
  if (body.isPrimary && hasSortOrder) {
    throw new ValidationError('Specify either "isPrimary" or "sortOrder", not both.', 422);
  }

  return {
    altText: hasAltText ? optionalText(body.altText, 'altText', 255) : undefined,
    sortOrder: hasSortOrder
      ? Number(unsignedInteger(body.sortOrder, 'sortOrder', { maximum: BigInt(4294967295) }))
      : undefined,
    isPrimary: body.isPrimary === true,
  };
}

function validateAdminListQuery(query, { allowStatus = true } = {}) {
  const fields = new Set(['page', 'limit', ...(allowStatus ? ['status'] : [])]);
  onlyFields(query, fields);
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value) || typeof value !== 'string') {
      throw new ValidationError(`Query parameter "${key}" must be provided once.`);
    }
  }
  const status = query.status;
  if (status !== undefined && !['active', 'inactive', 'draft', 'archived'].includes(status)) {
    throw new ValidationError('"status" is invalid.', 422);
  }
  return {
    page: parsePage(query.page, 'page', 1, 1000000),
    limit: parsePage(query.limit, 'limit', 50, 100),
    status,
  };
}

function validateId(value, field = 'id') {
  return unsignedInteger(value, field, { allowZero: false });
}

module.exports = {
  validateAdminListQuery,
  validateCategoryBody,
  validateCategoryStatusBody,
  validateId,
  validateImageUpdateBody,
  validateInventoryAdjustmentBody,
  validateProductBody,
  validateProductStatusBody,
};
