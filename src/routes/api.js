const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const repo = require('../repositories/fileRepository');
const storage = require('../services/storageService');
const { classify, buildAnalysis } = require('../services/lifecycleService');
const config = require('../config');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 10 }, fileFilter: (req, file, cb) => cb(null, !file.originalname.includes('\0')) });
router.get('/status', (req, res) => res.json({ storageMode: config.storageMode, simulation: repo.usingMemory() || config.storageMode === 'local', databaseMode: repo.usingMemory() ? 'in-memory (data resets on restart)' : 'MongoDB', lifecycleRules: config.lifecycle }));
router.get('/files', async (req, res, next) => { try { res.json(await repo.all()); } catch (error) { next(error); } });
router.get('/dashboard', async (req, res, next) => { try { res.json(buildAnalysis(await repo.all())); } catch (error) { next(error); } });
router.post('/upload', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one file (maximum 10 files, 25 MB each).' });
    const saved = [];
    for (const file of req.files) {
      const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
      const storageKey = await storage.store(file);
      const record = await repo.create({ originalName: file.originalname, storageKey, mimeType: file.mimetype, size: file.size, sha256, storageMode: config.storageMode, storageCategory: 'HOT', s3StorageClass: 'STANDARD' });
      saved.push(record);
    }
    res.status(201).json({ files: saved, message: `${saved.length} file(s) uploaded. Exact duplicates are retained safely as separate references and flagged in analysis.` });
  } catch (error) { next(error); }
});
router.get('/files/:id/download', async (req, res, next) => { try { const file = await repo.findById(req.params.id); if (!file) return res.status(404).json({ error: 'File not found.' }); const result = await storage.fetch(file); await repo.markAccessed(file._id); res.setHeader('Content-Type', result.contentType); res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`); result.stream.pipe(res); } catch (error) { next(error); } });
router.post('/analyze', async (req, res, next) => { try { const files = await repo.all(); await Promise.all(files.map((file) => repo.updateCategory(file._id, classify(file)))); res.json({ message: 'Lifecycle categories refreshed. This creates recommendations only; no AWS storage-class transition was performed.', analysis: buildAnalysis(await repo.all()) }); } catch (error) { next(error); } });
async function createDemoData(req, res, next, restart = false) {
  try {
    const files = await repo.all();
    if (files.some((file) => file.isDemo)) {
      if (!restart) return res.json({ message: 'The clearly-labelled demonstration dataset is already loaded.' });
      await repo.removeDemoFiles();
    }
    const daysAgo = (days) => new Date(Date.now() - days * 86400000);
    const gib = 1024 ** 3;
    const records = [
      { originalName: '[DEMO] Old research archive.zip', storageKey: `demo-research-${Date.now()}`, size: 8 * gib, sha256: 'demo-exact-copy-research', lastAccessedAt: daysAgo(125), uploadedAt: daysAgo(150) },
      { originalName: '[DEMO] Old research archive (copy).zip', storageKey: `demo-research-copy-${Date.now()}`, size: 8 * gib, sha256: 'demo-exact-copy-research', lastAccessedAt: daysAgo(125), uploadedAt: daysAgo(145) },
      { originalName: '[DEMO] Legacy database backup.tar', storageKey: `demo-backup-${Date.now()}`, size: 16 * gib, sha256: 'demo-legacy-backup', lastAccessedAt: daysAgo(210), uploadedAt: daysAgo(230) }
    ];
    await Promise.all(records.map((file) => repo.create({ ...file, mimeType: 'application/octet-stream', accessCount: 0, storageCategory: 'HOT', storageMode: config.storageMode, s3StorageClass: 'STANDARD', isDemo: true })));
    res.status(201).json({ message: restart ? 'Presentation demo restarted. Only synthetic demo metadata was replaced; your uploaded files are unchanged.' : 'Demonstration dataset loaded. It is metadata-only: no file was uploaded, migrated, or billed.' });
  } catch (error) { next(error); }
}
router.post('/demo-data', (req, res, next) => createDemoData(req, res, next));
router.post('/demo-data/restart', (req, res, next) => createDemoData(req, res, next, true));
module.exports = router;
