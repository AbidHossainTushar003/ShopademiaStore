const customerAuthService = require('../services/customer-auth.service');
const {
  validateLoginBody,
  validateRegistrationBody,
} = require('../validators/customer-auth.validators');

function createCustomerAuthController(pool, authConfig) {
  return {
    async register(request, response) {
      const input = validateRegistrationBody(request.body);
      const customer = await customerAuthService.register(pool, input);
      return response.status(201).json({ success: true, data: customer });
    },

    async login(request, response) {
      const credentials = validateLoginBody(request.body);
      const token = await customerAuthService.login(
        pool,
        authConfig,
        request.store.store_id,
        credentials,
      );
      return response.status(200).json({ success: true, data: token });
    },
  };
}

module.exports = createCustomerAuthController;
