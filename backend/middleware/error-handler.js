function errorHandler(config) {
  return (error, _request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Request body contains invalid JSON.',
        },
      });
    }

    if (error.type === 'entity.too.large') {
      return response.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request body is too large.',
        },
      });
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with one of these unique values already exists.',
        },
      });
    }

    if (
      error.code === 'ER_NO_REFERENCED_ROW_2' ||
      error.code === 'ER_ROW_IS_REFERENCED_2'
    ) {
      return response.status(409).json({
        success: false,
        error: {
          code: 'REFERENCE_CONFLICT',
          message: 'The requested change conflicts with existing catalog records.',
        },
      });
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const isServerError = statusCode >= 500;

    return response.status(statusCode).json({
      success: false,
      error: {
        code: error.publicCode || (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
        message: error.publicMessage || (isServerError && config.nodeEnv === 'production'
          ? 'An unexpected error occurred.'
          : (isServerError
            ? (error.message || 'An unexpected error occurred.')
            : 'The request could not be processed.')),
      },
    });
  };
}

module.exports = errorHandler;
