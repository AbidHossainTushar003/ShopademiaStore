const columns = 'customer_id, email, display_name, status, deleted_at, created_at, updated_at';
const credentialColumns = `${columns}, password_hash`;

async function createCustomer(pool, {
  email,
  displayName,
  passwordHash,
  status = 'active',
}) {
  const [result] = await pool.execute(
    'INSERT INTO customers (email, display_name, password_hash, status) VALUES (?, ?, ?, ?)',
    [email, displayName, passwordHash, status],
  );
  return getCustomerById(pool, result.insertId);
}

async function getCustomerById(pool, customerId) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM customers WHERE customer_id = ? AND deleted_at IS NULL`,
    [customerId],
  );
  return rows[0] || null;
}

async function getCustomerByEmail(pool, email) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM customers WHERE email = ? AND deleted_at IS NULL`,
    [email],
  );
  return rows[0] || null;
}

async function getCustomerCredentialsByEmail(pool, email) {
  const [rows] = await pool.execute(
    `SELECT ${credentialColumns} FROM customers WHERE email = ? AND deleted_at IS NULL`,
    [email],
  );
  return rows[0] || null;
}

async function updateCustomerDisplayName(pool, customerId, displayName) {
  await pool.execute(
    'UPDATE customers SET display_name = ? WHERE customer_id = ? AND status = ? AND deleted_at IS NULL',
    [displayName, customerId, 'active'],
  );
  const customer = await getCustomerById(pool, customerId);
  return customer?.status === 'active' && customer.display_name === displayName
    ? customer
    : null;
}

async function listCustomers(pool, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM customers WHERE deleted_at IS NULL ORDER BY customer_id LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
}

async function updateCustomer(pool, customerId, {
  email,
  displayName,
  passwordHash,
  status,
}) {
  const [result] = await pool.execute(
    'UPDATE customers SET email = ?, display_name = ?, password_hash = ?, status = ? WHERE customer_id = ? AND deleted_at IS NULL',
    [email, displayName, passwordHash, status, customerId],
  );
  return getCustomerById(pool, customerId);
}

async function softDeleteCustomer(pool, customerId) {
  const [result] = await pool.execute(
    "UPDATE customers SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ? AND deleted_at IS NULL",
    [customerId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createCustomer,
  getCustomerByEmail,
  getCustomerById,
  getCustomerCredentialsByEmail,
  listCustomers,
  softDeleteCustomer,
  updateCustomerDisplayName,
  updateCustomer,
};
