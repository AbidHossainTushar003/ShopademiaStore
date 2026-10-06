const multer = require('multer');

const MAX_TOTAL_UPLOAD_BYTES = 15 * 1024 * 1024;

const boundedMemoryStorage = {
  _handleFile(request, file, callback) {
    const chunks = [];
    let size = 0;
    let completed = false;
    request.productImageUploadBytes = request.productImageUploadBytes || 0;

    const finish = (error, information) => {
      if (completed) return;
      completed = true;
      callback(error, information);
    };

    file.stream.on('data', (chunk) => {
      const totalSize = request.productImageUploadBytes + chunk.length;
      if (totalSize > MAX_TOTAL_UPLOAD_BYTES) {
        finish(new multer.MulterError('LIMIT_FILE_SIZE', file.fieldname));
        file.stream.resume();
        return;
      }
      request.productImageUploadBytes = totalSize;
      size += chunk.length;
      chunks.push(chunk);
    });
    file.stream.on('error', (error) => finish(error));
    file.stream.on('end', () => {
      if (!completed) {
        finish(null, { buffer: Buffer.concat(chunks, size), size });
      }
    });
  },
  _removeFile(_request, file, callback) {
    delete file.buffer;
    callback(null);
  },
};

const upload = multer({
  storage: boundedMemoryStorage,
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
