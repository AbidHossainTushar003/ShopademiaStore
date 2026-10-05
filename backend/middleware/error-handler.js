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

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const isServerError = statusCode >= 500;

    return response.status(statusCode).json({
      success: false,
      error: {
        code: isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message: isServerError && config.nodeEnv === 'production'
          ? 'An unexpected error occurred.'
          : (isServerError
            ? (error.message || 'An unexpected error occurred.')
            : 'The request could not be processed.'),
      },
    });
  };
}

module.exports = errorHandler;
