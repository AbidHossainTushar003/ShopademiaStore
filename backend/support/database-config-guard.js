function createTestDatabaseConfig(environment) {
  if (environment.NODE_ENV !== 'test') {
    throw new Error('Database tests require NODE_ENV=test.');
  }

  const name = environment.TEST_DB_NAME;
  if (typeof name !== 'string' || !/^[A-Za-z0-9_$]+_test$/.test(name)) {
    throw new Error('Database tests require TEST_DB_NAME to end in _test.');
  }

  if (name === environment.DB_NAME) {
    throw new Error('The test database must be different from DB_NAME.');
  }

  if (!environment.TEST_DB_USER || !environment.TEST_DB_PASSWORD) {
    throw new Error('Database tests require dedicated TEST_DB_USER and TEST_DB_PASSWORD values.');
  }

  if (environment.TEST_DB_USER.toLowerCase() === 'root') {
    throw new Error('Database tests must not use the MySQL root account.');
  }

  return {
    host: environment.TEST_DB_HOST || environment.DB_HOST,
    port: Number(environment.TEST_DB_PORT || environment.DB_PORT || 3306),
    user: environment.TEST_DB_USER,
    password: environment.TEST_DB_PASSWORD,
    name,
  };
}

module.exports = { createTestDatabaseConfig };
