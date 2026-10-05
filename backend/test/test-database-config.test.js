const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabaseConfig } = require('../support/database-config-guard');
const { getMigrationFiles } = require('../scripts/migrate');

test('test database config refuses development and production environments', () => {
  for (const NODE_ENV of ['development', 'production']) {
    assert.throws(
      () => createTestDatabaseConfig({ NODE_ENV, TEST_DB_NAME: 'shopademia_test' }),
      /NODE_ENV=test/,
    );
  }
});

test('test database config requires an isolated _test database name', () => {
  assert.throws(
    () => createTestDatabaseConfig({ NODE_ENV: 'test', TEST_DB_NAME: 'shopademia' }),
    /end in _test/,
  );
  assert.throws(
    () => createTestDatabaseConfig({
      NODE_ENV: 'test',
      TEST_DB_NAME: 'shopademia_test',
      DB_NAME: 'shopademia_test',
    }),
    /different from DB_NAME/,
  );
  assert.throws(
    () => createTestDatabaseConfig({
      NODE_ENV: 'test',
      TEST_DB_NAME: 'shopademia_test',
    }),
    /dedicated TEST_DB_USER and TEST_DB_PASSWORD/,
  );
  assert.throws(
    () => createTestDatabaseConfig({
      NODE_ENV: 'test',
      TEST_DB_NAME: 'shopademia_test',
      TEST_DB_USER: 'root',
      TEST_DB_PASSWORD: 'test-placeholder',
    }),
    /must not use the MySQL root account/,
  );
});

test('test database config accepts a separate test database and dedicated credentials', () => {
  assert.deepEqual(createTestDatabaseConfig({
    NODE_ENV: 'test',
    DB_HOST: 'dev-db',
    DB_PORT: '3306',
    DB_USER: 'app_user',
    DB_PASSWORD: 'dev-placeholder',
    DB_NAME: 'shopademia',
    TEST_DB_NAME: 'shopademia_test',
    TEST_DB_HOST: 'test-db',
    TEST_DB_PORT: '3307',
    TEST_DB_USER: 'test_user',
    TEST_DB_PASSWORD: 'test-placeholder',
  }), {
    host: 'test-db',
    port: 3307,
    user: 'test_user',
    password: 'test-placeholder',
    name: 'shopademia_test',
  });
});

test('migration discovery returns unique, ordered migration filenames', async () => {
  const files = await getMigrationFiles();
  assert.equal(files.length, 28);
  assert.equal(files[0], '001_create_schema_migrations.sql');
  assert.equal(files.at(-1), '028_backfill_products_for_default_store.sql');
  assert.deepEqual(files, [...files].sort());
  assert.equal(new Set(files.map((file) => file.slice(0, 3))).size, files.length);
});
