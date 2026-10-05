const adminAuthService = require('../services/admin-auth.service');

function unauthorized(response) {
  return response.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' },
  });
}

function createAdminAuthentication(pool, authConfig) {
  return async (request, response, next) => {
    const authorization = request.get('authorization');

    if (
      typeof authorization !== 'string' ||
      authorization.length > 8192 ||
      !/^Bearer [A-Za-z0-9._-]+$/.test(authorization)
    ) {
      return unauthorized(response);
    }

    try {
      const admin = await adminAuthService.authenticate(
        pool,
        authConfig,
        authorization.slice('Bearer '.length),
      );

      if (!admin) {
        return unauthorized(response);
      }

      request.admin = {
        id: admin.admin_user_id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role_name,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = createAdminAuthentication;
