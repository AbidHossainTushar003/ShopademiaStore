const { spawn } = require('node:child_process');
const { createPool } = require('../database/pool');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('node:path');
const { createDatabaseIntegrationConfig } = require('../support/database-config-guard');
const { getMigrationFiles } = require('./migrate');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

function runProcess(command, args, { cwd, env, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`${command} failed with exit code ${code}: ${stderr.trim()}`));
      }
      return resolve(stdout);
    });
    if (input !== undefined) {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }
  });
}

function quoteDatabaseName(name) {
  if (!/^[A-Za-z0-9_$]+_test$/.test(name)) {
    throw new Error('Refusing a database name that does not end in _test.');
  }
  return `\`${name}\``;
}

function migrationEnvironment(config) {
  return {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '3000',
    ALLOWED_ORIGINS: 'https://integration-test.example.invalid',
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USER: config.user,
    DB_PASSWORD: config.password,
    DB_NAME: config.name,
    DB_POOL_SIZE: '3',
    DB_MIGRATION_USER: config.migrationUser,
    DB_MIGRATION_PASSWORD: config.migrationPassword,
    ADMIN_JWT_SECRET: 'phase14-integration-only-admin-secret-32-bytes',
    CUSTOMER_JWT_SECRET: 'phase14-integration-only-customer-secret-32',
    ADMIN_ACCESS_TOKEN_TTL_SECONDS: '900',
    CUSTOMER_ACCESS_TOKEN_TTL_SECONDS: '900',
    STORE_DATA_BACKFILL_APPROVED: 'I_HAVE_VERIFIED_BACKUP',
  };
}

function integrationTestEnvironment(config) {
  const environment = { ...process.env };
  delete environment.DB_NAME;
  environment.NODE_ENV = 'test';
  environment.TEST_DB_HOST = config.host;
  environment.TEST_DB_PORT = String(config.port);
  environment.TEST_DB_NAME = config.name;
  environment.TEST_DB_USER = config.user;
  environment.TEST_DB_PASSWORD = config.password;
  environment.SHOPADEMIA_DB_INTEGRATION = '1';
  return environment;
}

async function createFreshTestDatabases(config) {
  const adminPool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.adminUser,
    password: config.adminPassword,
    waitForConnections: true,
    connectionLimit: 2,
    connectTimeout: 10000,
  });
  try {
    await adminPool.query(`DROP DATABASE IF EXISTS ${quoteDatabaseName(config.name)}`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${quoteDatabaseName(config.secondName)}`);
    await adminPool.query(
      `CREATE DATABASE ${quoteDatabaseName(config.name)}
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await adminPool.query(
      `CREATE DATABASE ${quoteDatabaseName(config.secondName)}
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await adminPool.end();
  }
}

async function appliedMigrationCount(config) {
  const pool = createPool({ ...config, poolSize: 1 });
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM schema_migrations');
    return Number(rows[0].total);
  } finally {
    await pool.end();
  }
}

async function tableRowCounts(config) {
  const pool = createPool({ ...config, poolSize: 1 });
  try {
    const [tables] = await pool.execute(
      `SELECT table_name AS tableName
       FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [config.name],
    );
    const counts = {};
    for (const { tableName } of tables) {
      const escapedName = tableName.replace(/`/g, '``');
      const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${escapedName}\``);
      counts[tableName] = Number(rows[0].total);
    }
    return counts;
  } finally {
    await pool.end();
  }
}

async function createMysqlDump(config) {
  const env = { ...process.env, MYSQL_PWD: config.password };
  return runProcess('mysqldump', [
    '--host', config.host,
    '--port', String(config.port),
    '--user', config.user,
    '--single-transaction',
    '--quick',
    '--skip-lock-tables',
    '--skip-add-locks',
    '--skip-add-drop-table',
    '--no-tablespaces',
    '--set-gtid-purged=OFF',
    config.name,
  ], { cwd: path.resolve(__dirname, '..'), env });
}

async function restoreMysqlDump(config, dump) {
  const env = { ...process.env, MYSQL_PWD: config.password };
  await runProcess('mysql', [
    '--host', config.host,
    '--port', String(config.port),
    '--user', config.user,
    '--database', config.secondName,
  ], { cwd: path.resolve(__dirname, '..'), env, input: dump });
}

async function run() {
  const config = createDatabaseIntegrationConfig(process.env);
  const migrationFiles = await getMigrationFiles();
  if (migrationFiles.length !== 28) {
    throw new Error(`Expected 28 migrations, found ${migrationFiles.length}.`);
  }

  await runProcess('mysqldump', ['--version']);
  await runProcess('mysql', ['--version']);

  const commandEnvironment = migrationEnvironment(config);
  await createFreshTestDatabases(config);
  console.log(`Created fresh isolated test schemas: ${config.name}, ${config.secondName}.`);

  await runProcess(process.execPath, ['scripts/migrate.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: commandEnvironment,
  });
  const firstPassCount = await appliedMigrationCount(config);
  if (firstPassCount !== migrationFiles.length) {
    throw new Error(`First migration pass applied ${firstPassCount} of ${migrationFiles.length} files.`);
  }
  console.log(`First migration pass applied ${firstPassCount} migrations.`);

  await runProcess(process.execPath, ['scripts/migrate.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: commandEnvironment,
  });
  const secondPassCount = await appliedMigrationCount(config);
  if (secondPassCount !== firstPassCount) {
    throw new Error(`Idempotency check changed migration count from ${firstPassCount} to ${secondPassCount}.`);
  }
  console.log(`Second migration pass was idempotent; migration count remains ${secondPassCount}.`);

  await runProcess(process.execPath, ['--test', 'test/database.integration.test.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: integrationTestEnvironment(config),
  });
  console.log('Database-backed constraints, checkout rollback, stock locking, and isolation tests passed.');

  const sourceCounts = await tableRowCounts(config);
  const dump = await createMysqlDump(config);
  if (!dump.trim()) {
    throw new Error('mysqldump returned an empty backup.');
  }
  console.log(`mysqldump created a ${Buffer.byteLength(dump)}-byte logical backup.`);
  await restoreMysqlDump(config, dump);

  const restoredCounts = await tableRowCounts({ ...config, name: config.secondName });
  if (JSON.stringify(sourceCounts) !== JSON.stringify(restoredCounts)) {
    throw new Error('Source and restored table row counts differ.');
  }
  console.log(`Restore verified; matching row counts across ${Object.keys(sourceCounts).length} tables.`);
  console.log(JSON.stringify(sourceCounts, null, 2));
  console.log(`Both test databases retained for inspection: ${config.name}, ${config.secondName}.`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`Database integration run stopped: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { run, tableRowCounts };
