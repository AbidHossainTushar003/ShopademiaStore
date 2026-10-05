const customerAuthService = require('../services/customer-auth.service');
const {
  validateProfileBody,
  validateProfileQuery,
} = require('../validators/customer-auth.validators');

function notFound(response) {
  return response.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Customer profile was not found.' },
  });
}

function createCustomerProfileController(pool) {
  return {
    async getMe(request, response) {
      validateProfileQuery(request.query);
      const profile = await customerAuthService.getProfile(pool, request.customer.id);
      return profile
        ? response.status(200).json({ success: true, data: profile })
        : notFound(response);
    },

    async updateMe(request, response) {
      validateProfileQuery(request.query);
      const input = validateProfileBody(request.body);
      const profile = await customerAuthService.updateProfile(
        pool,
        request.customer.id,
        input,
      );
      return profile
        ? response.status(200).json({ success: true, data: profile })
        : notFound(response);
    },
  };
}

module.exports = createCustomerProfileController;
