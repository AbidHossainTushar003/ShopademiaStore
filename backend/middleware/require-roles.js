function requireRoles(...allowedRoles) {
  const roles = new Set(allowedRoles);

  return (request, response, next) => {
    if (!request.admin) {
      return response.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' },
      });
    }

    if (roles.size === 0 || !roles.has(request.admin.role)) {
      return response.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not permitted to access this resource.' },
      });
    }

    return next();
  };
}

module.exports = requireRoles;
