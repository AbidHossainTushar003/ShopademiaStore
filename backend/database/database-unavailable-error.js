class DatabaseUnavailableError extends Error {
  constructor(cause) {
    super('Database readiness check failed.', { cause });
    this.name = 'DatabaseUnavailableError';
    this.statusCode = 503;
    this.publicCode = 'DATABASE_UNAVAILABLE';
    this.publicMessage = 'The service is not ready.';
  }
}

module.exports = DatabaseUnavailableError;
