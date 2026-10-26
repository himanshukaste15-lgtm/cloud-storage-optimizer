const mongoose = require('mongoose');

const fileMetadataSchema = new mongoose.Schema({
  originalName: { type: String, required: true, trim: true },
  storageKey: { type: String, required: true, unique: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  size: { type: Number, required: true, min: 0 },
  uploadedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 0, min: 0 },
  storageCategory: { type: String, enum: ['HOT', 'WARM', 'COLD', 'ARCHIVE'], default: 'HOT' },
  sha256: { type: String, required: true, index: true },
  storageMode: { type: String, enum: ['local', 's3'], required: true },
  s3StorageClass: { type: String, default: 'STANDARD' },
  // Explicitly marks metadata-only records used in a classroom demo.
  isDemo: { type: Boolean, default: false }
}, { versionKey: false });

module.exports = mongoose.model('FileMetadata', fileMetadataSchema);
