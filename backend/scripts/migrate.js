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
const protectedBackfills = new Map([
  ['023_backfill_existing_carts.sql', 'carts'],
  ['026_backfill_existing_orders.sql', 'orders'],
]);
const productVisibilityBackfill = '028_backfill_products_for_default_store.sql';

class StoreBackfillApprovalError extends Error {}

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

    const storeMigrationsPending = migrationFiles.some((filename) => (
      BigInt(filename.match(/^\d+/)[0]) >= 18n && !appliedMigrations.has(filename)
    ));
    if (
      storeMigrationsPending &&
      process.env.STORE_DATA_BACKFILL_APPROVED !== 'I_HAVE_VERIFIED_BACKUP'
    ) {
      throw new StoreBackfillApprovalError(
        'Phase 11 migrations require a verified database backup and explicit backfill approval. After both, set STORE_DATA_BACKFILL_APPROVED=I_HAVE_VERIFIED_BACKUP and run migrations.',
      );
    }

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

      const backfillTable = protectedBackfills.get(filename);
      const isProductVisibilityBackfill = filename === productVisibilityBackfill;
      if (
        (backfillTable || isProductVisibilityBackfill) &&
        process.env.STORE_DATA_BACKFILL_APPROVED !== 'I_HAVE_VERIFIED_BACKUP'
      ) {
        throw new StoreBackfillApprovalError(
          `Migration ${filename} changes existing rows. Back up the database and set STORE_DATA_BACKFILL_APPROVED=I_HAVE_VERIFIED_BACKUP only after verifying the backup and authorizing this backfill.`,
        );
      }

      if (backfillTable || isProductVisibilityBackfill) {
        await connection.beginTransaction();
        let verificationSummary;
        try {
          const [beforeRows] = await connection.execute(
            `SELECT COUNT(*) AS total FROM ${backfillTable || 'products'}`,
          );
          const beforeTotal = Number(beforeRows[0].total);
          await connection.query(migrationSql);

          if (backfillTable) {
            const [afterRows] = await connection.execute(
              `SELECT COUNT(*) AS total,
                      SUM(store_id IS NULL) AS unassigned
               FROM ${backfillTable}`,
            );
            if (
              Number(afterRows[0].total) !== beforeTotal ||
              Number(afterRows[0].unassigned || 0) !== 0
            ) {
              throw new Error(`Migration ${filename} did not preserve and assign every row.`);
            }
            verificationSummary =
              `${backfillTable} count ${beforeTotal} before/${Number(afterRows[0].total)} after; unassigned 0`;
          } else {
            const [afterRows] = await connection.execute(
              'SELECT COUNT(*) AS total FROM products',
            );
            const [mappingRows] = await connection.execute(
              'SELECT COUNT(*) AS total FROM store_products WHERE store_id = 1',
            );
            if (
              Number(afterRows[0].total) !== beforeTotal ||
              Number(mappingRows[0].total) !== beforeTotal
            ) {
              throw new Error(`Migration ${filename} did not preserve and map every product.`);
            }
            verificationSummary =
              `products ${beforeTotal} before/${Number(afterRows[0].total)} after; default-store mappings ${Number(mappingRows[0].total)}`;
          }

          await connection.execute(
            'INSERT INTO schema_migrations (migration_name) VALUES (?)',
            [filename],
          );
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        }
        appliedCount += 1;
        console.log(`Applied verified store-data backfill: ${filename}; ${verificationSummary}.`);
        continue;
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
    } else if (error instanceof StoreBackfillApprovalError) {
      console.error(error.message);
    } else {
      console.error('Migration failed. Check database availability and migration SQL.');
    }
    process.exitCode = 1;
  });
}

module.exports = { getMigrationFiles, runMigrations };
