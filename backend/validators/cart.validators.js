const { ValidationError } = require('./catalog.validators');

const maximumQuantity = 99;
const maximumItemsPerCart = 50;
const maximumDatabaseId = 18446744073709551615n;

function onlyFields(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('A JSON object is required.', 422);
  }
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      throw new ValidationError(`Field "${field}" is not allowed.`, 422);
    }
  }
}

function validateId(value, field) {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    BigInt(value) > maximumDatabaseId
  ) {
    throw new ValidationError(`"${field}" must be a valid positive ID.`);
  }
  return value;
}

function validateCartQuery(query) {
  for (const key of Object.keys(query)) {
    throw new ValidationError(`Unknown query parameter "${key}".`);
  }
}

function validateProductId(value) {
  const productId = validateId(value, 'productId');
  return productId;
}

function validateItemId(value) {
  return validateId(value, 'itemId');
}

function validateQuantity(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > maximumQuantity) {
    throw new ValidationError(`"quantity" must be a positive integer no greater than ${maximumQuantity}.`, 422);
  }
  return value;
}

function validateAddItemBody(body) {
  onlyFields(body, new Set(['productId', 'quantity']));
  if (!Object.hasOwn(body, 'productId')) {
    throw new ValidationError('"productId" is required.', 422);
  }
  if (!Object.hasOwn(body, 'quantity')) {
    throw new ValidationError('"quantity" is required.', 422);
  }
  return {
    productId: validateProductId(
      typeof body.productId === 'number' && Number.isSafeInteger(body.productId)
        ? String(body.productId)
        : body.productId,
    ),
    quantity: validateQuantity(body.quantity),
  };
}

function validateUpdateItemBody(body) {
  onlyFields(body, new Set(['quantity']));
  if (!Object.hasOwn(body, 'quantity')) {
    throw new ValidationError('"quantity" is required.', 422);
  }
  return { quantity: validateQuantity(body.quantity) };
}

module.exports = {
  maximumItemsPerCart,
  maximumQuantity,
  validateAddItemBody,
  validateCartQuery,
  validateItemId,
  validateUpdateItemBody,
};
