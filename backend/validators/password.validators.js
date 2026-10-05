const { ValidationError } = require('./catalog.validators');

const commonPasswords = new Set([
  '1234567890',
  '123456789012',
  '123456789012345',
  'password123',
  'password1234',
  'password123456',
  'qwerty123',
  'qwerty123456',
  'letmein123',
  'letmein123456',
  'welcome123456',
  'admin12345678',
  'iloveyou123456',
]);

function validateStrongPassword(password, fieldName = 'password') {
  if (
    typeof password !== 'string' ||
    Buffer.byteLength(password, 'utf8') < 12 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    commonPasswords.has(password.toLowerCase())
  ) {
    throw new ValidationError(
      `"${fieldName}" must be at least 12 bytes, at most 72 bytes, and not a common password.`,
      422,
    );
  }

  return password;
}

module.exports = validateStrongPassword;
