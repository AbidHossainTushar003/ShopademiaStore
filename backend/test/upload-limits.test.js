const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const uploadProductImages = require('../middleware/product-image-upload');

function makeMultipartBody(fileSizes) {
  const boundary = 'shopademia-test-boundary';
  const parts = [];
  for (let index = 0; index < fileSizes.length; index += 1) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="image-${index}.png"\r\nContent-Type: image/png\r\n\r\n`,
    ));
    parts.push(Buffer.alloc(fileSizes[index], 0x61));
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(parts) };
}

function sendUpload(baseUrl, boundary, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: response.statusCode, text });
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

test('image upload rejects aggregate file bytes above 15 MB while retaining the per-file cap', async () => {
  const app = express();
  app.post('/images', uploadProductImages, (_request, response) => response.sendStatus(204));
  const server = app.listen(0);

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', resolve);
    });
    const { boundary, body } = makeMultipartBody([
      4 * 1024 * 1024,
      4 * 1024 * 1024,
      4 * 1024 * 1024,
      4 * 1024 * 1024,
    ]);
    const response = await sendUpload(
      `http://127.0.0.1:${server.address().port}/images`,
      boundary,
      body,
    );

    assert.equal(response.status, 413);
    assert.match(response.text, /UPLOAD_LIMIT_EXCEEDED/);

    const withinPerFileLimit = makeMultipartBody([5 * 1024 * 1024]);
    const accepted = await sendUpload(
      `http://127.0.0.1:${server.address().port}/images`,
      withinPerFileLimit.boundary,
      withinPerFileLimit.body,
    );
    assert.equal(accepted.status, 204);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
