const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const storageDirectory = path.resolve(__dirname, '..', 'storage', 'product-images');
const signatures = [
  {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    matches(buffer) {
      return buffer.length >= 3 &&
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    },
  },
  {
    extension: '.png',
    mimeType: 'image/png',
    matches(buffer) {
      return buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    },
  },
  {
    extension: '.webp',
    mimeType: 'image/webp',
    matches(buffer) {
      return buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP';
    },
  },
];

function detectSignature(buffer) {
  return signatures.find((signature) => signature.matches(buffer)) || null;
}

function getExtensionSignature(filename) {
  const extension = path.extname(filename).toLowerCase();
  return signatures.find((signature) => signature.extension === extension) || null;
}

function validateUpload(file) {
  if (
    !file ||
    typeof file.originalname !== 'string' ||
    path.basename(file.originalname) !== file.originalname ||
    /[\\/]/.test(file.originalname) ||
    file.originalname === '.' ||
    file.originalname === '..'
  ) {
    const error = new Error('Uploaded filename is invalid.');
    error.statusCode = 422;
    error.publicCode = 'INVALID_UPLOAD';
    error.publicMessage = 'Uploaded filename is invalid.';
    throw error;
  }

  const signature = detectSignature(file.buffer);
  const extensionSignature = getExtensionSignature(file.originalname);

  if (
    !signature ||
    signature !== extensionSignature ||
    file.mimetype !== signature.mimeType
  ) {
    const error = new Error('Uploaded image content does not match an allowed image type.');
    error.statusCode = 422;
    error.publicCode = 'INVALID_UPLOAD';
    error.publicMessage = 'Only valid JPEG, PNG, and WebP images are accepted.';
    throw error;
  }

  return signature;
}

async function storeProductImage(file) {
  const signature = validateUpload(file);
  await fs.mkdir(storageDirectory, { recursive: true });
  const filename = `${randomUUID()}${signature.extension}`;
  const target = path.join(storageDirectory, filename);
  await fs.writeFile(target, file.buffer, { flag: 'wx', mode: 0o640 });

  return {
    filename,
    imageUrl: `/media/products/${filename}`,
    async remove() {
      await fs.unlink(target);
    },
  };
}

async function removeProductImage(imageUrl) {
  const match = /^\/media\/products\/([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(imageUrl);

  if (!match) {
    throw new Error('Stored product image URL is invalid.');
  }

  await fs.unlink(path.join(storageDirectory, path.basename(imageUrl)));
}

module.exports = { removeProductImage, storeProductImage, validateUpload };
