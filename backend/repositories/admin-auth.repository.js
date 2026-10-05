async function getAdminCredentialsByEmail(pool, email) {
  const [rows] = await pool.execute(
    `SELECT admin_users.admin_user_id, admin_users.email, admin_users.display_name,
            admin_users.password_hash, admin_users.status, roles.role_name
     FROM admin_users
     INNER JOIN roles ON roles.role_id = admin_users.role_id
     WHERE admin_users.email = ? AND admin_users.deleted_at IS NULL`,
    [email],
  );
  return rows[0] || null;
}

async function getAdminById(pool, adminUserId) {
  const [rows] = await pool.execute(
    `SELECT admin_users.admin_user_id, admin_users.email, admin_users.display_name,
            admin_users.status, roles.role_name
     FROM admin_users
     INNER JOIN roles ON roles.role_id = admin_users.role_id
     WHERE admin_users.admin_user_id = ?
       AND admin_users.status = 'active'
       AND admin_users.deleted_at IS NULL`,
    [adminUserId],
  );
  return rows[0] || null;
}

module.exports = { getAdminById, getAdminCredentialsByEmail };
