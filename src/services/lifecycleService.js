const config = require('../config');

const PRICING_PER_GB_MONTH = { HOT: 0.023, WARM: 0.0125, COLD: 0.004, ARCHIVE: 0.00099 };
const TARGET_CLASS = { WARM: 'S3 Standard-IA', COLD: 'S3 Glacier Instant Retrieval', ARCHIVE: 'S3 Glacier Deep Archive' };

function daysSince(date, now = new Date()) { return Math.max(0, (now - new Date(date)) / 86400000); }
function classify(file, rules = config.lifecycle) {
  const age = daysSince(file.lastAccessedAt);
  if (age >= rules.archiveAfterDays) return 'ARCHIVE';
  if (age >= rules.coldAfterDays) return 'COLD';
  if (age >= rules.warmAfterDays) return 'WARM';
  return 'HOT';
}
function bytesToGb(bytes) { return bytes / (1024 ** 3); }
function buildAnalysis(files, rules = config.lifecycle) {
  const groups = new Map();
  files.forEach((file) => { const group = groups.get(file.sha256) || []; group.push(file); groups.set(file.sha256, group); });
  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  const distribution = { HOT: 0, WARM: 0, COLD: 0, ARCHIVE: 0 };
  let potentialSavings = 0;
  const recommendations = [];
  files.forEach((file) => {
    const recommendedCategory = classify(file, rules);
    distribution[file.storageCategory] = (distribution[file.storageCategory] || 0) + file.size;
    if (recommendedCategory !== 'HOT' && file.storageCategory !== recommendedCategory) {
      const monthlySaving = bytesToGb(file.size) * Math.max(0, PRICING_PER_GB_MONTH[file.storageCategory] - PRICING_PER_GB_MONTH[recommendedCategory]);
      potentialSavings += monthlySaving;
      recommendations.push({ fileId: String(file._id), name: file.originalName, currentCategory: file.storageCategory, recommendedCategory, targetStorageClass: TARGET_CLASS[recommendedCategory], lastAccessDays: Math.floor(daysSince(file.lastAccessedAt)), monthlySaving, monthlySavingInr: monthlySaving * config.usdToInr });
    }
  });
  return {
    totals: { files: files.length, bytes: files.reduce((sum, file) => sum + file.size, 0), duplicateGroups: duplicates.length, duplicateFiles: duplicates.reduce((sum, group) => sum + group.length - 1, 0), duplicateBytes: duplicates.reduce((sum, group) => sum + group.slice(1).reduce((n, file) => n + file.size, 0), 0), potentialMonthlySavings: potentialSavings, potentialMonthlySavingsInr: potentialSavings * config.usdToInr },
    distribution, duplicates: duplicates.map((group) => ({ sha256: group[0].sha256, files: group.map((file) => ({ id: String(file._id), name: file.originalName, size: file.size })) })), recommendations,
    assumptions: { pricing: PRICING_PER_GB_MONTH, usdToInr: config.usdToInr, note: `USD per GB-month estimates are converted using the configured assumption of 1 USD = ₹${config.usdToInr}. This is not a live exchange rate. Actual AWS cost varies by region, storage class, minimum-duration charges, requests, retrieval, and data transfer.` }
  };
}
module.exports = { classify, buildAnalysis, PRICING_PER_GB_MONTH };
