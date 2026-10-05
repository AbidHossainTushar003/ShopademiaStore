const { ValidationError } = require('./catalog.validators');
const validateStrongPassword = require('./password.validators');

function validateLoginBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON object is required.');
  }

  if (
    typeof body.email !== 'string' ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
  ) {
    throw new ValidationError('A valid email address is required.');
  }

  if (
    typeof body.password !== 'string' ||
    body.password.length === 0 ||
    Buffer.byteLength(body.password, 'utf8') > 72
  ) {
    throw new ValidationError('A valid password is required.');
  }

  return { email: body.email, password: body.password };
}

function validateBootstrapCredentials({ email, displayName, password }) {
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new ValidationError('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }

  if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 120) {
    throw new ValidationError('BOOTSTRAP_ADMIN_NAME must contain 1 to 120 characters.');
  }

  validateStrongPassword(password, 'BOOTSTRAP_ADMIN_PASSWORD');

  return {
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
    password,
  };
}

module.exports = { validateBootstrapCredentials, validateLoginBody };
