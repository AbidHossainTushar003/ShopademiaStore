const { ValidationError } = require('./catalog.validators');
const validateStrongPassword = require('./password.validators');

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

function validateEmail(email) {
  if (
    typeof email !== 'string' ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new ValidationError('A valid email address is required.', 422);
  }
  return email.trim().toLowerCase();
}

function validateRegistrationBody(body) {
  objectBody(body);
  onlyFields(body, new Set(['email', 'displayName', 'password']));

  if (
    typeof body.displayName !== 'string' ||
    !body.displayName.trim() ||
    body.displayName.trim().length > 120
  ) {
    throw new ValidationError('"displayName" must contain 1 to 120 characters.', 422);
  }

  return {
    email: validateEmail(body.email),
    displayName: body.displayName.trim(),
    password: validateStrongPassword(body.password),
  };
}

function validateLoginBody(body) {
  objectBody(body);
  onlyFields(body, new Set(['email', 'password']));

  if (
    typeof body.password !== 'string' ||
    body.password.length === 0 ||
    Buffer.byteLength(body.password, 'utf8') > 72
  ) {
    throw new ValidationError('A valid password is required.', 422);
  }

  return { email: validateEmail(body.email), password: body.password };
}

function validateProfileBody(body) {
  objectBody(body);
  onlyFields(body, new Set(['displayName']));

  if (
    !Object.hasOwn(body, 'displayName') ||
    typeof body.displayName !== 'string' ||
    !body.displayName.trim() ||
    body.displayName.trim().length > 120
  ) {
    throw new ValidationError('"displayName" must contain 1 to 120 characters.', 422);
  }

  return { displayName: body.displayName.trim() };
}

function validateProfileQuery(query) {
  onlyFields(query, new Set());
}

module.exports = {
  validateLoginBody,
  validateProfileBody,
  validateProfileQuery,
  validateRegistrationBody,
};
