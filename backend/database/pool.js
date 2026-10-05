const mysql = require('mysql2/promise');
const { checkDatabaseConnection } = require('../repositories/health.repository');

function createPool(databaseConfig) {
  return mysql.createPool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.name,
    waitForConnections: true,
    connectionLimit: databaseConfig.poolSize,
    queueLimit: databaseConfig.poolSize * 2,
    connectTimeout: 10000,
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'UTF8MB4_UNICODE_CI',
  });
}

module.exports = { checkDatabaseConnection, createPool };
