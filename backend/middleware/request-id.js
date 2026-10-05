const { randomUUID } = require('node:crypto');

function requestId(request, response, next) {
  request.id = randomUUID();
  response.setHeader('X-Request-Id', request.id);
  next();
}

module.exports = requestId;
