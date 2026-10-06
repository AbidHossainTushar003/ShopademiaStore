const allowedStoreStatuses = new Set(['active', 'inactive']);
const allowedVisibilities = new Set(['visible', 'hidden']);

function invalid(message = 'Store input is invalid.') {
  const error = new Error(message);
  error.statusCode = 422;
  error.publicCode = 'VALIDATION_ERROR';
  error.publicMessage = message;
  return error;
}

function objectBody(body, allowedKeys) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid();
  }
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
    throw invalid('The request contains unsupported fields.');
  }
  return body;
}

function validateStoreId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value)) {
    throw invalid('Store ID is invalid.');
  }
  return value;
}

function validateAdminId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value)) {
    throw invalid('Admin ID is invalid.');
  }
  return value;
}

function validateProductId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value)) {
    throw invalid('Product ID is invalid.');
  }
  return value;
}

function validateName(value) {
  if (
    typeof value !== 'string' ||
    value.trim().length < 1 ||
    value.trim().length > 120
  ) {
    throw invalid('Store name must be between 1 and 120 characters.');
  }
  return value.trim();
}

function validateSlug(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 100) {
    throw invalid('Store slug must use lowercase letters, numbers, and single hyphens.');
  }
  return value;
}

function validateOrigins(value, { requireHttps = false } = {}) {
  if (!Array.isArray(value) || value.length > 20) {
    throw invalid('allowedOrigins must be an array containing at most 20 origins.');
  }
  const origins = value.map((origin) => {
    if (typeof origin !== 'string' || origin.length > 255 || origin === '*') {
      throw invalid('Every allowed origin must be a specific HTTP or HTTPS origin.');
    }
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw invalid('Every allowed origin must be a specific HTTP or HTTPS origin.');
    }
    const validProtocol = requireHttps
      ? parsed.protocol === 'https:'
      : ['http:', 'https:'].includes(parsed.protocol);
    if (
      !validProtocol ||
      parsed.origin !== origin ||
      parsed.username ||
      parsed.password
    ) {
      throw invalid(requireHttps
        ? 'Every allowed origin must be a specific HTTPS origin in production.'
        : 'Every allowed origin must be a specific HTTP or HTTPS origin.');
    }
    return origin;
  });
  if (new Set(origins).size !== origins.length) {
    throw invalid('allowedOrigins must not contain duplicates.');
  }
  return origins;
}

function validateCreateStoreBody(body, originOptions) {
  const input = objectBody(body, ['name', 'slug', 'allowedOrigins']);
  return {
    name: validateName(input.name),
    slug: validateSlug(input.slug),
    allowedOrigins: validateOrigins(input.allowedOrigins, originOptions),
  };
}

function validateUpdateStoreBody(body, originOptions) {
  const input = objectBody(body, ['name', 'slug', 'allowedOrigins']);
  if (Object.keys(input).length === 0) {
    throw invalid('At least one store field must be supplied.');
  }
  return {
    ...(input.name !== undefined ? { name: validateName(input.name) } : {}),
    ...(input.slug !== undefined ? { slug: validateSlug(input.slug) } : {}),
    ...(input.allowedOrigins !== undefined
      ? { allowedOrigins: validateOrigins(input.allowedOrigins, originOptions) }
      : {}),
  };
}

function validateStatusBody(body) {
  const input = objectBody(body, ['status']);
  if (!allowedStoreStatuses.has(input.status)) {
    throw invalid('Store status must be active or inactive.');
  }
  return input.status;
}

function validateVisibilityBody(body) {
  const input = objectBody(body, ['visibility']);
  if (!allowedVisibilities.has(input.visibility)) {
    throw invalid('Product visibility must be visible or hidden.');
  }
  return input.visibility;
}

module.exports = {
  validateAdminId,
  validateCreateStoreBody,
  validateProductId,
  validateStatusBody,
  validateStoreId,
  validateUpdateStoreBody,
  validateVisibilityBody,
};
