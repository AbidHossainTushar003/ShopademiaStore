const bcrypt = require('bcrypt');
const { ConfigurationError, loadConfig } = require('../config/config');
const { createPool } = require('../database/pool');
const { createAdminUser } = require('../repositories/admin-users.repository');
const { createRole, getRoleByName } = require('../repositories/roles.repository');
const { validateBootstrapCredentials } = require('../validators/admin-auth.validators');

async function createInitialAdmin() {
  const config = loadConfig();

  if (config.nodeEnv === 'production') {
    throw new ConfigurationError('The bootstrap admin command is disabled in production.');
  }

  const credentials = validateBootstrapCredentials({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    displayName: process.env.BOOTSTRAP_ADMIN_NAME,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  const pool = createPool(config.database);

  try {
    for (const [roleName, description] of [
      ['super_admin', 'Full administrative access.'],
      ['admin', 'Standard administrative access.'],
    ]) {
      let role = await getRoleByName(pool, roleName);

      if (!role) {
        role = await createRole(pool, { roleName, description });
      }
    }

    const role = await getRoleByName(pool, 'super_admin');
    const passwordHash = await bcrypt.hash(credentials.password, 12);
    const admin = await createAdminUser(pool, {
      roleId: role.role_id,
      email: credentials.email,
      displayName: credentials.displayName,
      passwordHash,
      status: 'active',
    });

    console.log(`Created initial super administrator with ID ${admin.admin_user_id}.`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createInitialAdmin().catch((error) => {
    if (error instanceof ConfigurationError || error.name === 'ValidationError') {
      console.error(error.message);
    } else {
      console.error('Could not create the initial administrator. Check database availability and account uniqueness.');
    }
    process.exitCode = 1;
  });
}

module.exports = { createInitialAdmin };
