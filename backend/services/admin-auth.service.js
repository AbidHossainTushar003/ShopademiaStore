const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminAuthRepository = require('../repositories/admin-auth.repository');
const auditLogsRepository = require('../repositories/audit-logs.repository');

const BCRYPT_COST = 12;
const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString('hex'), BCRYPT_COST);
const invalidCredentials = Object.freeze({
  statusCode: 401,
  publicCode: 'INVALID_CREDENTIALS',
  publicMessage: 'Invalid email or password.',
});

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function recordLogin(pool, {
  adminUserId = null,
  outcome,
}) {
  await auditLogsRepository.createAuditLog(pool, {
    actorAdminUserId: adminUserId,
    action: outcome === 'success' ? 'admin.login.succeeded' : 'admin.login.failed',
    entityType: 'admin_auth',
    entityId: adminUserId === null ? 'unknown' : String(adminUserId),
    outcome,
  });
}

async function login(pool, authConfig, { email, password }) {
  const admin = await adminAuthRepository.getAdminCredentialsByEmail(
    pool,
    normalizeEmail(email),
  );
  const passwordMatches = await bcrypt.compare(
    password,
    admin?.password_hash || dummyPasswordHash,
  );
  const authenticated = Boolean(
    admin &&
    admin.status === 'active' &&
    passwordMatches,
  );

  if (!authenticated) {
    await recordLogin(pool, { outcome: 'failure' });
    throw invalidCredentials;
  }

  await recordLogin(pool, {
    adminUserId: admin.admin_user_id,
    outcome: 'success',
  });

  const accessToken = jwt.sign(
    {},
    authConfig.adminJwtSecret,
    {
      algorithm: 'HS256',
      subject: String(admin.admin_user_id),
      issuer: authConfig.issuer,
      audience: authConfig.adminAudience,
      expiresIn: authConfig.adminTokenLifetime,
    },
  );

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: authConfig.adminTokenLifetime,
  };
}

async function authenticate(pool, authConfig, token) {
  let claims;

  try {
    claims = jwt.verify(token, authConfig.adminJwtSecret, {
      algorithms: ['HS256'],
      issuer: authConfig.issuer,
      audience: authConfig.adminAudience,
    });
  } catch {
    return null;
  }

  if (
    typeof claims !== 'object' ||
    typeof claims.sub !== 'string' ||
    !/^[1-9]\d*$/.test(claims.sub)
  ) {
    return null;
  }

  return adminAuthRepository.getAdminById(pool, claims.sub);
}

module.exports = { BCRYPT_COST, authenticate, invalidCredentials, login, normalizeEmail };
