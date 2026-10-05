const DatabaseUnavailableError = require('../database/database-unavailable-error');
const { checkDatabaseConnection } = require('../repositories/health.repository');

function createReadinessController(pool) {
  return async (_request, response, next) => {
    try {
      await checkDatabaseConnection(pool);
      return response.status(200).json({
        success: true,
        data: { status: 'ready' },
      });
    } catch (error) {
      return next(new DatabaseUnavailableError(error));
    }
  };
}

module.exports = createReadinessController;
