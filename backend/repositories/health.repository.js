async function checkDatabaseConnection(pool) {
  await pool.execute('SELECT 1');
}

module.exports = { checkDatabaseConnection };
