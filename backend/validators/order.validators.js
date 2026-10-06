const { ValidationError } = require('./catalog.validators');

const orderStatuses = new Set([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
const paymentStatuses = new Set(['pending', 'paid', 'failed', 'cancelled']);
const maximumOrderOffset = 10000;

function validateShippingBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON object is required.', 422);
  }
  const allowedFields = new Set([
    'recipientName',
    'phone',
    'addressLine1',
    'addressLine2',
    'city',
    'region',
    'postalCode',
    'countryCode',
  ]);
  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new ValidationError(`Field "${field}" is not allowed.`, 422);
    }
  }

  const requiredLengths = {
    recipientName: 120,
    phone: 24,
    addressLine1: 180,
    city: 100,
    region: 100,
    postalCode: 20,
  };
  const shipping = {};
  for (const [field, maximum] of Object.entries(requiredLengths)) {
    const value = body[field];
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > maximum
    ) {
      throw new ValidationError(`"${field}" must contain 1 to ${maximum} characters.`, 422);
    }
    shipping[field] = value.trim();
  }

  if (!/^\+?[0-9][0-9(). -]{5,22}$/.test(shipping.phone)) {
    throw new ValidationError('"phone" must be a valid phone number.', 422);
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u.test(shipping.recipientName)) {
    throw new ValidationError('"recipientName" contains invalid characters.', 422);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(shipping.postalCode)) {
    throw new ValidationError('"postalCode" contains invalid characters.', 422);
  }

  if (body.addressLine2 === undefined || body.addressLine2 === null) {
    shipping.addressLine2 = null;
  } else if (
    typeof body.addressLine2 !== 'string' ||
    body.addressLine2.trim().length > 180
  ) {
    throw new ValidationError('"addressLine2" must not exceed 180 characters.', 422);
  } else {
    shipping.addressLine2 = body.addressLine2.trim() || null;
  }

  if (
    typeof body.countryCode !== 'string' ||
    !/^[A-Za-z]{2}$/.test(body.countryCode)
  ) {
    throw new ValidationError('"countryCode" must be a two-letter country code.', 422);
  }
  shipping.countryCode = body.countryCode.toUpperCase();
  return shipping;
}

function validateIdempotencyKey(value) {
  if (
    typeof value !== 'string' ||
    value.length < 16 ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new ValidationError(
      'A valid Idempotency-Key header of 16 to 128 safe characters is required.',
      422,
    );
  }
  return value;
}

function validateOrderId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || BigInt(value) > 18446744073709551615n) {
    throw new ValidationError('"orderId" must be a valid positive ID.');
  }
  return value;
}

function validateNoOrderQuery(query) {
  for (const field of Object.keys(query)) {
    throw new ValidationError(`Unknown query parameter "${field}".`);
  }
}

function validateOrderListQuery(query, { admin = false } = {}) {
  const allowed = new Set(['page', 'limit']);
  if (admin) {
    allowed.add('orderStatus');
    allowed.add('paymentStatus');
  }
  for (const field of Object.keys(query)) {
    if (!allowed.has(field)) {
      throw new ValidationError(`Unknown query parameter "${field}".`);
    }
  }

  const parse = (value, field, fallback, maximum) => {
    if (value === undefined) return fallback;
    if (Array.isArray(value) || !/^[1-9]\d*$/.test(value)) {
      throw new ValidationError(`"${field}" must be a positive integer.`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > maximum) {
      throw new ValidationError(`"${field}" is outside the supported range.`);
    }
    return number;
  };
  const orderStatus = query.orderStatus;
  const paymentStatus = query.paymentStatus;
  if (orderStatus !== undefined && !orderStatuses.has(orderStatus)) {
    throw new ValidationError('"orderStatus" is invalid.', 422);
  }
  if (paymentStatus !== undefined && !paymentStatuses.has(paymentStatus)) {
    throw new ValidationError('"paymentStatus" is invalid.', 422);
  }
  const page = parse(query.page, 'page', 1, 1000000);
  const limit = parse(query.limit, 'limit', 20, 100);
  if ((page - 1) * limit > maximumOrderOffset) {
    throw new ValidationError(
      `"page" and "limit" cannot request an offset greater than ${maximumOrderOffset} rows.`,
      422,
    );
  }
  return {
    page,
    limit,
    orderStatus,
    paymentStatus,
  };
}

function validateOrderStatusBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON object is required.', 422);
  }
  if (Object.keys(body).some((field) => field !== 'orderStatus')) {
    throw new ValidationError('Only "orderStatus" may be provided.', 422);
  }
  if (!orderStatuses.has(body.orderStatus)) {
    throw new ValidationError('"orderStatus" is invalid.', 422);
  }
  return body.orderStatus;
}

function validatePaymentStatusBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON object is required.', 422);
  }
  if (Object.keys(body).some((field) => field !== 'paymentStatus')) {
    throw new ValidationError('Only "paymentStatus" may be provided.', 422);
  }
  if (!paymentStatuses.has(body.paymentStatus)) {
    throw new ValidationError('"paymentStatus" is invalid.', 422);
  }
  return body.paymentStatus;
}

module.exports = {
  validateIdempotencyKey,
  validateOrderId,
  validateOrderListQuery,
  validateNoOrderQuery,
  validateOrderStatusBody,
  validatePaymentStatusBody,
  validateShippingBody,
};
