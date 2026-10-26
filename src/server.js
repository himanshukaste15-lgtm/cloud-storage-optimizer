const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config');
const repo = require('./repositories/fileRepository');
const api = require('./routes/api');

async function start() {
  if (config.mongoUri) {
    try { await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000 }); repo.setDatabaseAvailable(true); console.log('Connected to MongoDB.'); }
    catch (error) { console.warn(`MongoDB unavailable; using in-memory development mode: ${error.message}`); }
  } else console.warn('MONGODB_URI not set; using in-memory development mode.');
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use((error, req, res, next) => { console.error(error); const status = error instanceof multer.MulterError ? 400 : 500; res.status(status).json({ error: error.message || 'Unexpected server error.' }); });
  const server = app.listen(config.port, () => console.log(`Cloud Storage Optimizer running at http://localhost:${config.port}`));
  return { app, server };
}
if (require.main === module) start();
module.exports = { start };
