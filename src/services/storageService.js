const fs = require('fs/promises');
const path = require('path');
const { Readable } = require('stream');
const crypto = require('crypto');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const config = require('../config');

const s3 = config.storageMode === 's3' ? new S3Client({ region: config.aws.region }) : null;
function assertConfigured() { if (config.storageMode === 's3' && !config.aws.bucket) throw new Error('AWS_S3_BUCKET is required when STORAGE_MODE=s3.'); }
function storageKey(name) { return `${Date.now()}-${crypto.randomUUID()}-${path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')}`; }
async function store(file) {
  const key = storageKey(file.originalname);
  if (config.storageMode === 's3') {
    assertConfigured();
    await new Upload({ client: s3, params: { Bucket: config.aws.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype, StorageClass: 'STANDARD' } }).done();
  } else {
    await fs.mkdir(config.localStorageDir, { recursive: true });
    await fs.writeFile(path.join(config.localStorageDir, key), file.buffer);
  }
  return key;
}
async function fetch(file) {
  if (file.storageMode === 's3') {
    const response = await s3.send(new GetObjectCommand({ Bucket: config.aws.bucket, Key: file.storageKey }));
    return { stream: response.Body, contentType: response.ContentType || file.mimeType };
  }
  return { stream: Readable.from(await fs.readFile(path.join(config.localStorageDir, file.storageKey))), contentType: file.mimeType };
}
module.exports = { store, fetch };
