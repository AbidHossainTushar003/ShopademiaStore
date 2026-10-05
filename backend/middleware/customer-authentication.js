const customerAuthService = require('../services/customer-auth.service');

function unauthorized(response) {
  return response.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' },
  });
}

function createCustomerAuthentication(pool, authConfig) {
  return async (request, response, next) => {
    const authorization = request.get('authorization');

    if (
      typeof authorization !== 'string' ||
      authorization.length > 8192 ||
      !/^Bearer [^\s]+$/.test(authorization)
    ) {
      return unauthorized(response);
    }

    try {
      response.setHeader('Cache-Control', 'private, no-store');
      const customer = await customerAuthService.authenticate(
        pool,
        authConfig,
        authorization.slice('Bearer '.length),
        request.store.store_id,
      );

      if (!customer) {
        return unauthorized(response);
      }

      request.customer = {
        id: customer.customer_id,
        email: customer.email,
        displayName: customer.display_name,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = createCustomerAuthentication;
