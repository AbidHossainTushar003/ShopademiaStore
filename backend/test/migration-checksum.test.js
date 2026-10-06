const test = require('node:test');
const assert = require('node:assert/strict');
const { computeMigrationChecksum, ensureMigrationChecksumColumn } = require('../scripts/migrate');

test('migration checksums are deterministic', () => {
  const first = computeMigrationChecksum('CREATE TABLE example (id INT NOT NULL PRIMARY KEY);');
  const second = computeMigrationChecksum('CREATE TABLE example (id INT NOT NULL PRIMARY KEY);');

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
});

test('checksum column addition is safe for older schema_migrations tables', async () => {
  const calls = [];
  const connection = {
    async execute(sql) {
      calls.push(sql);
      if (sql === 'SHOW COLUMNS FROM schema_migrations') {
        return [[{ Field: 'migration_name' }, { Field: 'applied_at' }]];
      }
      return [[]];
    },
  };

  await ensureMigrationChecksumColumn(connection);

  assert.equal(calls[0], 'SHOW COLUMNS FROM schema_migrations');
  assert.equal(
    calls[1],
    'ALTER TABLE schema_migrations ADD COLUMN checksum CHAR(64) NULL AFTER migration_name',
  );
});
