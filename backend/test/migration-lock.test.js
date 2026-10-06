const test = require('node:test');
const assert = require('node:assert/strict');
const { isMigrationLockAcquired } = require('../scripts/migrate');

test('migration lock result accepts mysql numeric and big-number string values only', () => {
  assert.equal(isMigrationLockAcquired(1), true);
  assert.equal(isMigrationLockAcquired('1'), true);
  assert.equal(isMigrationLockAcquired(0), false);
  assert.equal(isMigrationLockAcquired('0'), false);
  assert.equal(isMigrationLockAcquired(null), false);
  assert.equal(isMigrationLockAcquired(undefined), false);
  assert.equal(isMigrationLockAcquired(true), false);
});
