const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const customersRepository = require('../repositories/customers.repository');
const { BCRYPT_COST } = require('./admin-auth.service');

const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString('hex'), BCRYPT_COST);
const invalidCredentials = Object.freeze({
  statusCode: 401,
  publicCode: 'INVALID_CREDENTIALS',
  publicMessage: 'Invalid email or password.',
});

function publicCustomer(customer) {
  return {
    id: customer.customer_id,
    email: customer.email,
    displayName: customer.display_name,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  };
}

function issueToken(authConfig, customerId, storeId) {
  return {
    accessToken: jwt.sign(
      { sid: String(storeId) },
      authConfig.customerJwtSecret,
      {
        algorithm: 'HS256',
        subject: String(customerId),
        issuer: authConfig.issuer,
        audience: authConfig.customerAudience,
        expiresIn: authConfig.customerTokenLifetime,
      },
    ),
    tokenType: 'Bearer',
    expiresIn: authConfig.customerTokenLifetime,
  };
}

async function register(pool, input) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const customer = await customersRepository.createCustomer(pool, {
    email: input.email,
    displayName: input.displayName,
    passwordHash,
  });
  return publicCustomer(customer);
}

async function login(pool, authConfig, storeId, { email, password }) {
  const customer = await customersRepository.getCustomerCredentialsByEmail(pool, email);
  const passwordMatches = await bcrypt.compare(
    password,
    customer?.password_hash || dummyPasswordHash,
  );

  if (!customer || customer.status !== 'active' || !passwordMatches) {
    throw invalidCredentials;
  }

  return issueToken(authConfig, customer.customer_id, storeId);
}

async function authenticate(pool, authConfig, token, storeId) {
  let claims;

  try {
    claims = jwt.verify(token, authConfig.customerJwtSecret, {
      algorithms: ['HS256'],
      issuer: authConfig.issuer,
      audience: authConfig.customerAudience,
    });
  } catch {
    return null;
  }

  if (
    typeof claims !== 'object' ||
    typeof claims.sub !== 'string' ||
    !/^[1-9]\d*$/.test(claims.sub) ||
    claims.sid !== String(storeId)
  ) {
    return null;
  }

  const customer = await customersRepository.getCustomerById(pool, claims.sub);
  return customer?.status === 'active' ? customer : null;
}

async function getProfile(pool, customerId) {
  const customer = await customersRepository.getCustomerById(pool, customerId);
  return customer ? publicCustomer(customer) : null;
}

async function updateProfile(pool, customerId, { displayName }) {
  const customer = await customersRepository.updateCustomerDisplayName(
    pool,
    customerId,
    displayName,
  );
  return customer ? publicCustomer(customer) : null;
}

module.exports = { authenticate, getProfile, login, register, updateProfile };
