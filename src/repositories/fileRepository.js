const FileMetadata = require('../models/FileMetadata');
const crypto = require('crypto');

let memoryFiles = [];
let databaseAvailable = false;
const clone = (item) => ({ ...item, _id: String(item._id) });

function setDatabaseAvailable(value) { databaseAvailable = value; }
function usingMemory() { return !databaseAvailable; }

async function create(data) {
  if (!usingMemory()) return (await FileMetadata.create(data)).toObject();
  const record = { ...data, _id: crypto.randomUUID(), uploadedAt: data.uploadedAt || new Date(), lastAccessedAt: data.lastAccessedAt || new Date(), accessCount: data.accessCount || 0 };
  memoryFiles.push(record);
  return clone(record);
}

async function all() {
  if (!usingMemory()) return FileMetadata.find().sort({ uploadedAt: -1 }).lean();
  return memoryFiles.map(clone).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

async function findById(id) {
  if (!usingMemory()) return FileMetadata.findById(id).lean();
  const match = memoryFiles.find((file) => String(file._id) === String(id));
  return match ? clone(match) : null;
}

async function markAccessed(id) {
  const now = new Date();
  if (!usingMemory()) return FileMetadata.findByIdAndUpdate(id, { $set: { lastAccessedAt: now }, $inc: { accessCount: 1 } }, { new: true }).lean();
  const file = memoryFiles.find((item) => String(item._id) === String(id));
  if (!file) return null;
  file.lastAccessedAt = now; file.accessCount += 1;
  return clone(file);
}

async function updateCategory(id, storageCategory) {
  if (!usingMemory()) return FileMetadata.findByIdAndUpdate(id, { storageCategory }, { new: true }).lean();
  const file = memoryFiles.find((item) => String(item._id) === String(id));
  if (file) file.storageCategory = storageCategory;
  return file ? clone(file) : null;
}

async function removeDemoFiles() {
  if (!usingMemory()) return FileMetadata.deleteMany({ isDemo: true });
  const before = memoryFiles.length;
  memoryFiles = memoryFiles.filter((file) => !file.isDemo);
  return { deletedCount: before - memoryFiles.length };
}

function resetMemoryForTests() { memoryFiles = []; }
module.exports = { setDatabaseAvailable, usingMemory, create, all, findById, markAccessed, updateCategory, removeDemoFiles, resetMemoryForTests };
