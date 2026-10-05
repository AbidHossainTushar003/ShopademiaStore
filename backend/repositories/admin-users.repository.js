const columns = 'admin_user_id, role_id, email, display_name, status, deleted_at, created_at, updated_at';
const credentialColumns = `${columns}, password_hash`;

async function createAdminUser(pool, {
  roleId,
  email,
  displayName,
  passwordHash,
  status = 'disabled',
}) {
  const [result] = await pool.execute(
    'INSERT INTO admin_users (role_id, email, display_name, password_hash, status) VALUES (?, ?, ?, ?, ?)',
    [roleId, email, displayName, passwordHash, status],
  );
  return getAdminUserById(pool, result.insertId);
}

async function getAdminUserById(pool, adminUserId) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM admin_users WHERE admin_user_id = ? AND deleted_at IS NULL`,
    [adminUserId],
  );
  return rows[0] || null;
}

async function getAdminUserByEmail(pool, email) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM admin_users WHERE email = ? AND deleted_at IS NULL`,
    [email],
  );
  return rows[0] || null;
}

async function getAdminUserCredentialsByEmail(pool, email) {
  const [rows] = await pool.execute(
    `SELECT ${credentialColumns} FROM admin_users WHERE email = ? AND deleted_at IS NULL`,
    [email],
  );
  return rows[0] || null;
}

async function listAdminUsers(pool, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM admin_users WHERE deleted_at IS NULL ORDER BY admin_user_id LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
}

async function updateAdminUser(pool, adminUserId, {
  roleId,
  email,
  displayName,
  passwordHash,
  status,
}) {
  const [result] = await pool.execute(
    'UPDATE admin_users SET role_id = ?, email = ?, display_name = ?, password_hash = ?, status = ? WHERE admin_user_id = ? AND deleted_at IS NULL',
    [roleId, email, displayName, passwordHash, status, adminUserId],
  );
  return getAdminUserById(pool, adminUserId);
}

async function softDeleteAdminUser(pool, adminUserId) {
  const [result] = await pool.execute(
    "UPDATE admin_users SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP WHERE admin_user_id = ? AND deleted_at IS NULL",
    [adminUserId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createAdminUser,
  getAdminUserByEmail,
  getAdminUserById,
  getAdminUserCredentialsByEmail,
  listAdminUsers,
  softDeleteAdminUser,
  updateAdminUser,
};
