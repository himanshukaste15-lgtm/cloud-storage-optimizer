const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, buildAnalysis } = require('../src/services/lifecycleService');

const ago = (days) => new Date(Date.now() - days * 86400000);
test('classifies files from hot through archive', () => {
  assert.equal(classify({ lastAccessedAt: ago(2) }), 'HOT');
  assert.equal(classify({ lastAccessedAt: ago(35) }), 'WARM');
  assert.equal(classify({ lastAccessedAt: ago(100) }), 'COLD');
  assert.equal(classify({ lastAccessedAt: ago(200) }), 'ARCHIVE');
});
test('reports safe duplicate grouping and recommendations', () => {
  const analysis = buildAnalysis([
    { _id: 'one', originalName: 'a.pdf', sha256: 'same', size: 1073741824, storageCategory: 'HOT', lastAccessedAt: ago(100) },
    { _id: 'two', originalName: 'copy.pdf', sha256: 'same', size: 1073741824, storageCategory: 'HOT', lastAccessedAt: ago(100) }
  ]);
  assert.equal(analysis.totals.duplicateFiles, 1);
  assert.equal(analysis.recommendations.length, 2);
  assert.ok(analysis.totals.potentialMonthlySavings > 0);
  assert.ok(analysis.totals.potentialMonthlySavingsInr > analysis.totals.potentialMonthlySavings);
});
