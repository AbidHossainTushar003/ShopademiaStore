function createTestDatabaseConfig(environment) {
  if (environment.NODE_ENV !== 'test') {
    throw new Error('Database tests require NODE_ENV=test.');
  }
  if (
    typeof environment.TEST_DB_HOST !== 'string' ||
    !environment.TEST_DB_HOST.trim() ||
    !/^\d+$/.test(environment.TEST_DB_PORT || '') ||
    Number(environment.TEST_DB_PORT) < 1 ||
    Number(environment.TEST_DB_PORT) > 65535
  ) {
    throw new Error('Database tests require a dedicated TEST_DB_HOST and valid TEST_DB_PORT.');
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
    host: environment.TEST_DB_HOST,
    port: Number(environment.TEST_DB_PORT),
    user: environment.TEST_DB_USER,
    password: environment.TEST_DB_PASSWORD,
    name,
  };
}

function createDatabaseIntegrationConfig(environment) {
  const primary = createTestDatabaseConfig(environment);
  const secondName = environment.SECOND_TEST_DB_NAME;
  if (typeof secondName !== 'string' || !/^[A-Za-z0-9_$]+_test$/.test(secondName)) {
    throw new Error('Database integration tests require SECOND_TEST_DB_NAME to end in _test.');
  }
  if (
    secondName === primary.name ||
    secondName === environment.DB_NAME
  ) {
    throw new Error('The restore database must be distinct from both configured databases.');
  }
  if (environment.TEST_DB_RESET_APPROVED !== 'I_CONFIRM_DROP_NAMED_TEST_DATABASES') {
    throw new Error(
      'Set TEST_DB_RESET_APPROVED only after verifying both configured names are disposable test databases.',
    );
  }

  const requiredCredentials = [
    'TEST_DB_ADMIN_USER',
    'TEST_DB_ADMIN_PASSWORD',
    'TEST_MIGRATION_USER',
    'TEST_MIGRATION_PASSWORD',
  ];
  for (const variable of requiredCredentials) {
    if (!environment[variable]) {
      throw new Error(`Database integration tests require ${variable}.`);
    }
  }
  if (
    [environment.TEST_DB_ADMIN_USER, environment.TEST_MIGRATION_USER]
      .some((user) => user.toLowerCase() === 'root')
  ) {
    throw new Error('Database integration tests must not use the MySQL root account.');
  }
  if (
    environment.TEST_DB_ADMIN_USER === primary.user ||
    environment.TEST_MIGRATION_USER === primary.user ||
    environment.TEST_DB_ADMIN_USER === environment.TEST_MIGRATION_USER
  ) {
    throw new Error('Database integration tests require distinct admin, migration, and application accounts.');
  }

  return {
    ...primary,
    secondName,
    adminUser: environment.TEST_DB_ADMIN_USER,
    adminPassword: environment.TEST_DB_ADMIN_PASSWORD,
    migrationUser: environment.TEST_MIGRATION_USER,
    migrationPassword: environment.TEST_MIGRATION_PASSWORD,
  };
}

module.exports = { createDatabaseIntegrationConfig, createTestDatabaseConfig };
