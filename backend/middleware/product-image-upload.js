const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  preservePath: true,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 0,
    parts: 5,
  },
});

function uploadProductImages(request, response, next) {
  upload.array('images', 5)(request, response, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
        return response.status(413).json({
          success: false,
          error: { code: 'UPLOAD_LIMIT_EXCEEDED', message: 'Upload size or file count exceeds the allowed limit.' },
        });
      }

      if (error instanceof multer.MulterError) {
        return response.status(400).json({
          success: false,
          error: { code: 'INVALID_UPLOAD', message: 'Multipart upload is invalid.' },
        });
      }

      return next(error);
    }

    if (!request.files?.length) {
      return response.status(400).json({
        success: false,
        error: { code: 'INVALID_UPLOAD', message: 'At least one image file is required.' },
      });
    }

    return next();
  });
}

module.exports = uploadProductImages;
