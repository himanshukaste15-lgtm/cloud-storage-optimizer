// Optional seed for demonstrating lifecycle recommendations. Requires MongoDB configured.
const mongoose = require('mongoose');
const config = require('../src/config');
const FileMetadata = require('../src/models/FileMetadata');
if (!config.mongoUri) throw new Error('Set MONGODB_URI before running npm run seed.');
const ago = (days) => new Date(Date.now() - days * 86400000);
(async () => {
  await mongoose.connect(config.mongoUri);
  await FileMetadata.deleteMany({ storageKey: /^sample-/ });
  await FileMetadata.insertMany([
    { originalName: 'semester-notes.pdf', storageKey: 'sample-notes', mimeType: 'application/pdf', size: 5_242_880, uploadedAt: ago(200), lastAccessedAt: ago(120), accessCount: 1, storageCategory: 'HOT', sha256: 'sample-duplicate-hash', storageMode: 'local' },
    { originalName: 'semester-notes-copy.pdf', storageKey: 'sample-notes-copy', mimeType: 'application/pdf', size: 5_242_880, uploadedAt: ago(190), lastAccessedAt: ago(120), accessCount: 0, storageCategory: 'HOT', sha256: 'sample-duplicate-hash', storageMode: 'local' },
    { originalName: 'recent-project.zip', storageKey: 'sample-recent', mimeType: 'application/zip', size: 2_097_152, uploadedAt: ago(3), lastAccessedAt: ago(1), accessCount: 8, storageCategory: 'HOT', sha256: 'sample-recent-hash', storageMode: 'local' }
  ]);
  console.log('Sample metadata inserted. These records point to placeholder local keys, so use them for dashboard demonstration only, not downloads.');
  await mongoose.disconnect();
})();
