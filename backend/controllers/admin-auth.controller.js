const adminAuthService = require('../services/admin-auth.service');
const { validateLoginBody } = require('../validators/admin-auth.validators');

function createAdminAuthController(pool, authConfig) {
  return {
    async login(request, response) {
      const credentials = validateLoginBody(request.body);
      const token = await adminAuthService.login(pool, authConfig, credentials);
      return response.status(200).json({ success: true, data: token });
    },

    me(request, response) {
      return response.status(200).json({
        success: true,
        data: { ...request.admin },
      });
    },
  };
}

module.exports = createAdminAuthController;
