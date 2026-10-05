const fs = require('node:fs/promises');
const path = require('node:path');
const { ConfigurationError, loadConfig } = require('../config/config');
const { createPool } = require('../database/pool');

const migrationsDirectory = path.resolve(__dirname, '..', 'migrations');
const migrationLockName = 'shopademia_schema_migrations';
const migrationTrackingTable = `CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function isMigrationFilename(filename) {
  return /^\d{3,}_[a-z0-9][a-z0-9_-]*\.sql$/.test(filename);
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });
  const sqlEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'));

  if (sqlEntries.some((entry) => !isMigrationFilename(entry.name))) {
    throw new Error('Migration SQL filenames must use the format 001_description.sql.');
  }

  const files = sqlEntries.map((entry) => entry.name).sort();

  for (let index = 1; index < files.length; index += 1) {
    const currentPrefix = BigInt(files[index].match(/^\d+/)[0]);
    const previousPrefix = BigInt(files[index - 1].match(/^\d+/)[0]);

    if (currentPrefix === previousPrefix) {
      throw new Error('Migration filenames must have unique numeric prefixes.');
    }
  }

  return files;
}

async function runMigrations() {
  const config = loadConfig({ requireMigrationCredentials: true });
  const pool = createPool({
    ...config.database,
    ...config.migrationCredentials,
  });
  let connection;
  let lockAcquired = false;

  try {
    connection = await pool.getConnection();
    const [lockRows] = await connection.execute(
      'SELECT GET_LOCK(?, ?) AS acquired',
      [migrationLockName, 10],
    );

    if (lockRows[0]?.acquired !== 1) {
      throw new Error('Could not acquire the database migration lock.');
    }

    lockAcquired = true;
    await connection.query(migrationTrackingTable);

    const [appliedRows] = await connection.execute(
      'SELECT migration_name FROM schema_migrations',
    );
    const appliedMigrations = new Set(appliedRows.map((row) => row.migration_name));
    const migrationFiles = await getMigrationFiles();
    let appliedCount = 0;

    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        continue;
      }

      const migrationSql = (await fs.readFile(
        path.join(migrationsDirectory, filename),
        'utf8',
      )).trim();

      if (!migrationSql) {
        throw new Error(`Migration ${filename} is empty.`);
      }

      await connection.query(migrationSql);
      await connection.execute(
        'INSERT INTO schema_migrations (migration_name) VALUES (?)',
        [filename],
      );
      appliedCount += 1;
      console.log(`Applied migration: ${filename}`);
    }

    if (appliedCount === 0) {
      console.log('Database is up to date.');
    }
  } finally {
    try {
      if (connection && lockAcquired) {
        try {
          await connection.execute('SELECT RELEASE_LOCK(?)', [migrationLockName]);
        } finally {
          connection.release();
        }
      } else if (connection) {
        connection.release();
      }
    } finally {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    if (error instanceof ConfigurationError) {
      console.error(`Configuration error: ${error.message}`);
    } else {
      console.error('Migration failed. Check database availability and migration SQL.');
    }
    process.exitCode = 1;
  });
}

module.exports = { getMigrationFiles, runMigrations };
