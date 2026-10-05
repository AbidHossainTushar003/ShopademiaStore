const rateLimit = require('express-rate-limit').rateLimit;

const limitAdminUploads = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_request, response) {
    return response.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many product image uploads. Try again later.',
      },
    });
  },
});

module.exports = limitAdminUploads;
