function requestLogger(request, response, next) {
  const startedAt = process.hrtime.bigint();
  const pathname = request.path;

  response.once('finish', () => {
    const statusCode = response.statusCode;
    const event = statusCode === 401 || statusCode === 403 || statusCode === 429
      ? 'security.request_rejected'
      : 'http.request.completed';
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    console.log(JSON.stringify({
      event,
      requestId: request.id,
      method: request.method,
      path: pathname,
      statusCode,
      durationMs: Number(durationMs.toFixed(3)),
    }));
  });

  return next();
}

module.exports = requestLogger;
