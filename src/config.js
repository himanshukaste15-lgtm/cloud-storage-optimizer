const path = require('path');
require('dotenv').config();

const rootDir = path.resolve(__dirname, '..');
const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

module.exports = {
  port: number(process.env.PORT, 3000),
  mongoUri: process.env.MONGODB_URI || '',
  storageMode: (process.env.STORAGE_MODE || 'local').toLowerCase(),
  localStorageDir: path.resolve(rootDir, process.env.LOCAL_STORAGE_DIR || 'storage'),
  aws: { region: process.env.AWS_REGION || 'ap-south-1', bucket: process.env.AWS_S3_BUCKET || '' },
  lifecycle: {
    warmAfterDays: number(process.env.WARM_AFTER_DAYS, 30),
    coldAfterDays: number(process.env.COLD_AFTER_DAYS, 90),
    archiveAfterDays: number(process.env.ARCHIVE_AFTER_DAYS, 180)
  },
  usdToInr: number(process.env.USD_TO_INR, 86)
};
