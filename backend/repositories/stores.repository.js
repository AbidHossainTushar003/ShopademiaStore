const storeColumns = `store_id, name, slug, status, credential_hash,
  key_revoked_at, allowed_origins, created_at, updated_at`;

function parseOrigins(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toStore(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    allowed_origins: parseOrigins(row.allowed_origins),
    has_active_key: Boolean(row.credential_hash) && row.key_revoked_at === null,
  };
}

async function getActiveStoreByCredentialHash(pool, credentialHash) {
  const [rows] = await pool.execute(
    `SELECT ${storeColumns}
     FROM stores
     WHERE credential_hash = ?
       AND key_revoked_at IS NULL
       AND status = 'active'
     LIMIT 1`,
    [credentialHash],
  );
  return toStore(rows[0]);
}

async function listStoresForOrigin(pool, origin) {
  const [rows] = await pool.execute(
    `SELECT store_id
     FROM stores
     WHERE status = 'active'
       AND credential_hash IS NOT NULL
       AND key_revoked_at IS NULL
       AND JSON_CONTAINS(allowed_origins, JSON_QUOTE(?)) = 1
     LIMIT 1`,
    [origin],
  );
  return rows;
}

async function listStores(pool) {
  const [rows] = await pool.execute(
    `SELECT ${storeColumns} FROM stores ORDER BY store_id`,
  );
  return rows.map(toStore);
}

async function getStoreById(executor, storeId, { forUpdate = false } = {}) {
  const [rows] = await executor.execute(
    `SELECT ${storeColumns}
     FROM stores WHERE store_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [storeId],
  );
  return toStore(rows[0]);
}

async function createStore(connection, { name, slug, allowedOrigins, credentialHash }) {
  const [result] = await connection.execute(
    `INSERT INTO stores
       (name, slug, status, credential_hash, allowed_origins)
     VALUES (?, ?, 'inactive', ?, ?)`,
    [name, slug, credentialHash, JSON.stringify(allowedOrigins)],
  );
  return getStoreById(connection, result.insertId);
}

async function updateStore(connection, storeId, { name, slug, allowedOrigins }) {
  await connection.execute(
    `UPDATE stores
     SET name = ?, slug = ?, allowed_origins = ?
     WHERE store_id = ?`,
    [name, slug, JSON.stringify(allowedOrigins), storeId],
  );
  return getStoreById(connection, storeId);
}

async function updateCredentialHash(connection, storeId, credentialHash) {
  await connection.execute(
    `UPDATE stores
     SET credential_hash = ?, key_revoked_at = NULL
     WHERE store_id = ?`,
    [credentialHash, storeId],
  );
}

async function revokeCredential(connection, storeId) {
  await connection.execute(
    `UPDATE stores
     SET credential_hash = NULL, key_revoked_at = CURRENT_TIMESTAMP
     WHERE store_id = ?`,
    [storeId],
  );
}

async function updateStoreStatus(connection, storeId, status) {
  await connection.execute(
    'UPDATE stores SET status = ? WHERE store_id = ?',
    [status, storeId],
  );
  return getStoreById(connection, storeId);
}

async function hasStoreAdmin(executor, storeId, adminUserId) {
  const [rows] = await executor.execute(
    'SELECT 1 FROM store_admins WHERE store_id = ? AND admin_user_id = ?',
    [storeId, adminUserId],
  );
  return rows.length > 0;
}

async function getAssignableAdmin(executor, adminUserId) {
  const [rows] = await executor.execute(
    `SELECT au.admin_user_id
     FROM admin_users au
     INNER JOIN roles r ON r.role_id = au.role_id
     WHERE au.admin_user_id = ?
       AND au.status = 'active'
       AND au.deleted_at IS NULL
       AND r.role_name = 'admin'`,
    [adminUserId],
  );
  return rows[0] || null;
}

async function listStoreAdmins(executor, storeId) {
  const [rows] = await executor.execute(
    `SELECT au.admin_user_id, au.email, au.display_name, sa.created_at
     FROM store_admins sa
     INNER JOIN admin_users au ON au.admin_user_id = sa.admin_user_id
     INNER JOIN roles r ON r.role_id = au.role_id
     WHERE sa.store_id = ?
       AND au.status = 'active'
       AND au.deleted_at IS NULL
       AND r.role_name = 'admin'
     ORDER BY au.admin_user_id`,
    [storeId],
  );
  return rows;
}

async function addStoreAdmin(connection, storeId, adminUserId) {
  await connection.execute(
    'INSERT INTO store_admins (store_id, admin_user_id) VALUES (?, ?)',
    [storeId, adminUserId],
  );
}

async function removeStoreAdmin(connection, storeId, adminUserId) {
  const [result] = await connection.execute(
    'DELETE FROM store_admins WHERE store_id = ? AND admin_user_id = ?',
    [storeId, adminUserId],
  );
  return result.affectedRows > 0;
}

async function getVisibility(executor, storeId, productId) {
  const [rows] = await executor.execute(
    `SELECT visibility FROM store_products
     WHERE store_id = ? AND product_id = ?`,
    [storeId, productId],
  );
  return rows[0]?.visibility || null;
}

async function productExists(executor, productId) {
  const [rows] = await executor.execute(
    'SELECT product_id FROM products WHERE product_id = ?',
    [productId],
  );
  return rows[0] || null;
}

async function setVisibility(connection, storeId, productId, visibility) {
  await connection.execute(
    `INSERT INTO store_products (store_id, product_id, visibility)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE visibility = VALUES(visibility)`,
    [storeId, productId, visibility],
  );
}

module.exports = {
  addStoreAdmin,
  createStore,
  getActiveStoreByCredentialHash,
  getAssignableAdmin,
  getStoreById,
  getVisibility,
  hasStoreAdmin,
  listStores,
  listStoreAdmins,
  listStoresForOrigin,
  productExists,
  removeStoreAdmin,
  revokeCredential,
  setVisibility,
  updateCredentialHash,
  updateStore,
  updateStoreStatus,
};
