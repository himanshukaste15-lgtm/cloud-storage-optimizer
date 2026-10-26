# Intelligent Cloud Storage Lifecycle Manager

A college mini-project that uploads files, records their metadata, detects exact duplicates with SHA-256, classifies lifecycle temperature, and recommends lower-cost AWS S3 storage classes. It never deletes files and never performs a storage-class migration automatically.

## What works

- Upload up to 10 files at a time (25 MB each) to AWS S3 or local development storage.
- Save metadata in MongoDB; when MongoDB is unavailable, safely use an in-memory mode clearly labelled in the UI.
- SHA-256 duplicate detection. Duplicates remain separate physical objects/references, so no shared object is accidentally removed.
- HOT/WARM/COLD/ARCHIVE recommendations driven by configurable inactivity thresholds.
- Dashboard totals, distribution chart, duplicate groups, downloads, and potential monthly saving estimates.

## Quick start (local, no AWS required)

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000` and upload files.

With `STORAGE_MODE=local` and no `MONGODB_URI`, uploads are written under `storage/` and metadata lives only until the server restarts. The dashboard displays this as simulated/development mode. This is ideal for a quick demo before cloud credentials are available.

## MongoDB setup

Use either MongoDB Community Server or MongoDB Atlas. Set `MONGODB_URI` in `.env`, restart the server, and the status label changes to MongoDB-backed storage. An Atlas connection string should be stored only in `.env`, never committed.

## AWS S3 setup

1. Create an S3 bucket in your desired AWS region (for example `ap-south-1`). Keep Block Public Access enabled.
2. Create an IAM user/role with scoped `s3:PutObject` and `s3:GetObject` permission only for that bucket. Do **not** use root credentials.
3. Configure credentials through AWS CLI/default credential chain or local environment variables.
4. Set `STORAGE_MODE=s3`, `AWS_REGION`, and `AWS_S3_BUCKET` in `.env`, then restart.
5. Upload a small test file and download it from the dashboard to verify access.

The app uses S3 `STANDARD` on upload. It does **not** call `CopyObject`, `PutObject` with a replacement storage class, lifecycle configuration APIs, or delete APIs. Thus dashboard recommendations are not claims of completed AWS migration or real savings.

## Lifecycle rules and pricing

Default rules: WARM after 30 inactive days, COLD after 90, ARCHIVE after 180. Change `WARM_AFTER_DAYS`, `COLD_AFTER_DAYS`, and `ARCHIVE_AFTER_DAYS` in `.env` for a visible demonstration.

Illustrative monthly storage rates used: HOT `$0.023`, WARM `$0.0125`, COLD `$0.004`, ARCHIVE `$0.00099` per GB-month. The dashboard prominently shows costs in Indian rupees and also displays the underlying USD value. `USD_TO_INR=86` is a configurable, documented conversion assumption—not a live exchange-rate feed. These are broad S3 list-price examples, **not a quote**. Actual charges depend on region, requests, retrieval, minimum storage durations, early-deletion fees, and data transfer.

## Test and sample data

Run lifecycle tests:

```powershell
npm test
```

Run `npm run seed` only after configuring MongoDB. It adds dashboard sample metadata; their local object keys are placeholders and cannot be downloaded. For a fully functional demo, upload two copies of the same real file plus an old sample inserted in MongoDB.

## Suggested demo / screenshots

1. Dashboard with the clear local simulated-mode banner.
2. Upload two same-content files; capture the duplicate group shown by SHA-256 prefix.
3. Set low lifecycle thresholds such as `WARM_AFTER_DAYS=0`, restart, and capture recommendations.
4. Download a file and show its access count increment after refresh.
5. Optionally switch to S3 mode and show a real object in the private bucket.

## 5-minute live demonstration flow

1. Start with `npm run dev` and open `http://localhost:3000`. Point out the **SIMULATED** badge when using local mode: it is honest local development, not a claim of AWS billing.
2. Click **Load presentation demo data**. This creates three clearly-labelled, metadata-only records (two 8 GiB exact copies and one 16 GiB inactive backup). No real object is uploaded or billed.
   Use **Restart presentation demo** before another audience: it replaces only these synthetic records and never removes real uploaded files.
3. Point to the rupee total and say: “The app converts its USD storage estimate using the configurable `USD_TO_INR` assumption, currently ₹86 per USD.”
4. Open **Exact duplicate groups** and explain the matching SHA-256 hash. The manager identifies candidates; it does not delete files automatically.
5. Open **Lifecycle recommendations**. Explain that 125-day files are recommended for COLD and the 210-day file for ARCHIVE. These are suggestions only; no S3 transition has run.
6. Upload the same small file twice to show real SHA-256 duplicate detection, then download one file to demonstrate the access counter.
7. Conclude: “With AWS credentials, the exact same upload/download flow uses private S3; MongoDB persists metadata. The local mode makes the project safe and reliable to demonstrate anywhere.”

## Project layout

```text
src/models          MongoDB schema
src/repositories    MongoDB/in-memory metadata storage
src/services        lifecycle logic and local/S3 adapters
src/routes          REST API
public              HTML/CSS/JavaScript dashboard
test                unit tests
scripts             optional sample metadata seed
```

## Mini-project report outline

1. Abstract and problem statement: inactive cloud files waste money.
2. Objectives and scope: analysis/recommendation, not automatic deletion or migration.
3. Architecture: browser → Express API → MongoDB metadata + S3/local object storage.
4. Method: upload, hash, metadata persistence, lifecycle rules, duplicate grouping, cost calculation.
5. Implementation and UI screenshots.
6. Testing results and validation.
7. Limitations: simple access tracking counts downloads through this app; pricing is estimated.
8. Future scope: authenticated users, real S3 transition approval flow, scheduled scans, AWS Cost Explorer.

## Presentation outline / viva notes

- **Problem:** all files in hot storage is convenient but can be unnecessarily expensive.
- **SHA-256:** a fixed fingerprint of file bytes; identical fingerprints identify exact duplicates (with practical cryptographic confidence).
- **Metadata:** file name, bytes, dates, access count, category, hash, object key and storage mode are saved separately from file content.
- **Lifecycle engine:** compares days since access against configurable thresholds, then recommends a category.
- **Safety:** no automatic deletion; duplicate entries stay independent; no migration is claimed until a real S3 transition API is added and executed.
- **Cost:** bytes are converted to GiB and multiplied by category-rate differences. It is a decision-support estimate, not a bill.

## API endpoints

`POST /api/upload`, `GET /api/files`, `GET /api/files/:id/download`, `GET /api/dashboard`, `POST /api/analyze`, `GET /api/status`.
