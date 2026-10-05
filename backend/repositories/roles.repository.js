async function createRole(pool, { roleName, description = null }) {
  const [result] = await pool.execute(
    'INSERT INTO roles (role_name, description) VALUES (?, ?)',
    [roleName, description],
  );
  return getRoleById(pool, result.insertId);
}

async function getRoleById(pool, roleId) {
  const [rows] = await pool.execute(
    'SELECT role_id, role_name, description, created_at, updated_at FROM roles WHERE role_id = ?',
    [roleId],
  );
  return rows[0] || null;
}

async function getRoleByName(pool, roleName) {
  const [rows] = await pool.execute(
    'SELECT role_id, role_name, description, created_at, updated_at FROM roles WHERE role_name = ?',
    [roleName],
  );
  return rows[0] || null;
}

async function listRoles(pool, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.execute(
    'SELECT role_id, role_name, description, created_at, updated_at FROM roles ORDER BY role_id LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows;
}

async function updateRole(pool, roleId, { roleName, description }) {
  await pool.execute(
    'UPDATE roles SET role_name = ?, description = ? WHERE role_id = ?',
    [roleName, description, roleId],
  );
  return getRoleById(pool, roleId);
}

module.exports = { createRole, getRoleById, getRoleByName, listRoles, updateRole };
