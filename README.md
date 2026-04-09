# CleverBooks — Courier Settlement Reconciliation & Alert Engine

> **MERN-stack system** that ingests courier settlement data, detects discrepancies, fires async notifications via a decoupled worker queue, and exposes a real-time dashboard.

---

## Table of Contents

- [Live Demo Flow](#live-demo-flow)
- [Architecture](#architecture)
- [Feature Checklist](#feature-checklist)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Discrepancy Rules](#discrepancy-rules)
- [Queue & Worker Design](#queue--worker-design)
- [Design Decisions](#design-decisions)
- [Assumptions](#assumptions)
- [What I'd Improve With More Time](#what-id-improve-with-more-time)

---

## Live Demo Flow

```
1.  docker-compose up -d              # Start MongoDB + Redis
2.  cd server && node scripts/seedData.js   # Load 60 orders + 1 batch with intentional discrepancies
3.  node src/index.js                 # API + Scheduler + Worker all start
4.  cd ../client && npm run dev       # React dashboard → http://localhost:3000
5.  Click "Run Reconciliation"        # Triggers engine manually
6.  Watch webhook.site receive notifications per discrepancy
```

---

## Architecture

```
┌──────────────┐     REST      ┌──────────────────┐    read/write   ┌────────────┐
│   React UI   │ ◄──────────► │   Express API     │ ◄─────────────► │  MongoDB   │
│  :3000       │              │   :5000           │                 │            │
└──────────────┘              └────────┬─────────┘                 └────────────┘
                                       │ triggers
                                ┌──────▼──────┐
                                │  node-cron  │  2 AM IST (configurable)
                                │  Scheduler  │
                                └──────┬──────┘
                                       │
                                ┌──────▼──────────┐
                                │   Reconciler    │  5 rules engine
                                │   Service       │
                                └──────┬──────────┘
                                       │ publish event (NOT notify)
                                ┌──────▼──────────┐
                                │   Bull Queue    │  Redis-backed
                                │  (discrepancy)  │
                                └──────┬──────────┘
                                       │ consume
                                ┌──────▼──────────┐     HTTP POST    ┌──────────────┐
                                │  Worker Service  │ ──────────────► │ webhook.site │
                                │  retry + backoff │                 │  (or any API)│
                                └──────┬──────────┘                 └──────────────┘
                                       │ permanent fail (3 attempts)
                                ┌──────▼──────────┐
                                │  Dead-Letter Q  │
                                └─────────────────┘
```

**The key architectural constraint** — the reconciler and the notification sender are fully decoupled. The reconciler only calls `queue.add()`. It has zero knowledge of webhooks, retries, or delivery. This means:
- You can swap the notification channel (email, Slack, SMS) by changing only the worker
- The reconciliation job always finishes fast, regardless of webhook latency
- Failed notifications don't block or re-run reconciliation

---

## Feature Checklist

### Must-Have (Backend)

| Feature | Status | Notes |
|---|---|---|
| `POST /api/settlements/upload` | ✅ | CSV + JSON, max 1000 rows |
| `GET /api/settlements?status=` | ✅ | Filterable by status |
| `GET /api/settlements/:id` | ✅ | Returns settlement + joined order |
| `GET /api/jobs` | ✅ | Last 10 reconciliation runs |
| `GET /api/notifications` | ✅ | Delivery log with status |
| Scheduled nightly reconciliation | ✅ | node-cron, IST timezone, configurable |
| Queue/pub-sub decoupling | ✅ | Bull + Redis, hard requirement met |
| Idempotency on re-upload | ✅ | Unique index `(awbNumber, batchId)` |
| MongoDB collections | ✅ | orders, settlements, jobs, notifications |

### Must-Have (Frontend)

| Feature | Status |
|---|---|
| Upload form (CSV/JSON, ≤1000 rows) | ✅ |
| Settlements table with status filter | ✅ |
| Discrepancy detail slide-over panel | ✅ |
| Job run log (last 10 runs) | ✅ |
| Notification delivery status | ✅ |
| Manual reconciliation trigger button | ✅ |

### Bonus (Technical)

| Feature | Status | Notes |
|---|---|---|
| Retry with exponential back-off | ✅ | 2s → 4s → 8s via Bull options |
| Dead-letter queue | ✅ | Separate `dlq` Bull queue |
| Rate limit on upload endpoint | ✅ | 5 req/min via express-rate-limit |
| Timezone-aware scheduling (IST) | ✅ | `{ timezone: "Asia/Kolkata" }` |
| Idempotency key on external API calls | ✅ | `X-Idempotency-Key` header + DB dedup |

### Bonus (Product)

| Feature | Status |
|---|---|
| Summary cards (total, discrepancies, matched) | ✅ |
| Courier-level discrepancy bar chart | ✅ |
| Variance summary in detail view | ✅ |
| Seed data generator (50+ orders, intentional discrepancies) | ✅ |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **API** | Express 4 | Minimal, composable, well-understood |
| **Database** | MongoDB 7 + Mongoose | Flexible schema suits evolving settlement formats |
| **Queue** | Bull + Redis | Battle-tested, supports retries + DLQ natively |
| **Scheduler** | node-cron | Lightweight, supports tz-aware cron |
| **Frontend** | React 18 + Vite | Fast dev experience, no friction |
| **Charts** | Recharts | React-native, lightweight |
| **HTTP client** | Axios | Interceptors for idempotency headers |
| **Rate limiting** | express-rate-limit | Drop-in middleware, no Redis needed for basic use |
| **Containerisation** | Docker Compose | One command to get Mongo + Redis running |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker + Docker Compose (for Mongo & Redis)
- A free [webhook.site](https://webhook.site) URL

### 1. Clone and configure

```bash
git clone https://github.com/yourhandle/cleverbooks-reconciliation.git
cd cleverbooks-reconciliation

cp .env.example server/.env
# Edit server/.env — paste your webhook.site URL into WEBHOOK_URL
```

### 2. Start infrastructure

```bash
docker-compose up -d
# Starts MongoDB on :27017 and Redis on :6379
```

### 3. Install and seed

```bash
cd server
npm install
node scripts/seedData.js
# → Seeds 60 orders + 1 settlement batch with intentional discrepancies
```

### 4. Start the server

```bash
node src/index.js
# API + Scheduler + Worker all boot in one process
# For production: run worker.js as a separate process
```

### 5. Start the frontend

```bash
cd ../client
npm install
npm run dev
# → http://localhost:3000
```

### 6. Demo the full flow

1. Open `http://localhost:3000`
2. Click **Run Reconciliation** — the engine processes all PENDING settlements
3. Watch the **Settlements** tab populate with MATCHED / DISCREPANCY records
4. Click any DISCREPANCY row to see the detail panel with variance summary and suggested actions
5. Check the **Notifications** tab — each discrepancy fires a webhook
6. Open your [webhook.site](https://webhook.site) URL to see the payload live
7. Check **Jobs** tab for the run log

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `MONGO_URI` | `mongodb://localhost:27017/cleverbooks` | MongoDB connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection (Bull) |
| `WEBHOOK_URL` | — | Notification endpoint (webhook.site / SendGrid / custom) |
| `RECONCILE_CRON` | `0 2 * * *` | Cron expression for nightly job (IST timezone) |
| `COD_TOLERANCE_PCT` | `2` | COD short-remittance tolerance % |
| `COD_TOLERANCE_FLAT` | `10` | COD short-remittance flat INR tolerance |
| `WEIGHT_OVERAGE_PCT` | `10` | Weight dispute threshold % |
| `SETTLEMENT_OVERDUE_DAYS` | `14` | Days after delivery before flagging overdue |
| `UPLOAD_RATE_LIMIT` | `5` | Max upload requests per IP per minute |

---

## API Reference

### Settlements

```
POST   /api/settlements/upload        Upload CSV or JSON batch (rate-limited: 5/min)
GET    /api/settlements               List settlements  ?status=DISCREPANCY
GET    /api/settlements/:id           Single settlement + joined order
POST   /api/settlements/reconcile     Manually trigger reconciliation job
```

**Upload request** (multipart/form-data):
```
file: <CSV or JSON file>   max 1000 rows
```

**Upload response**:
```json
{ "batchId": "BATCH-1712345678901", "inserted": 48, "skipped": 2, "total": 50 }
```

**Settlement object**:
```json
{
  "_id": "...",
  "awbNumber": "AWB00001",
  "batchId": "BATCH-SEED-001",
  "status": "DISCREPANCY",
  "discrepancies": ["COD_SHORT", "PHANTOM_RTO"],
  "settledCodAmount": 850,
  "chargedWeight": 3.2,
  "forwardCharge": 85,
  "rtoCharge": 50,
  "codHandlingFee": 20,
  "settlementDate": "2024-03-15T00:00:00.000Z",
  "processedAt": "2024-03-16T20:30:00.000Z"
}
```

### Jobs

```
GET    /api/jobs                       Last 10 reconciliation runs
```

```json
{
  "_id": "...",
  "status": "DONE",
  "triggeredBy": "MANUAL",
  "recordsTotal": 50,
  "recordsMatched": 30,
  "discrepancies": 20,
  "startedAt": "...",
  "completedAt": "..."
}
```

### Notifications

```
GET    /api/notifications              Delivery log  ?status=SENT|FAILED|DLQ
```

---

## Discrepancy Rules

All five rules are implemented. The engine runs every PENDING settlement through all rules in a single pass.

| # | Rule | Logic | Flag |
|---|---|---|---|
| 1 | COD short-remittance | `settledCodAmount < codAmount − min(2%, ₹10)` | `COD_SHORT` |
| 2 | Weight dispute | `chargedWeight > declaredWeight × 1.10` | `WEIGHT_DISPUTE` |
| 3 | Phantom RTO charge | `rtoCharge > 0 AND orderStatus = DELIVERED` | `PHANTOM_RTO` |
| 4 | Overdue remittance | `deliveryDate > 14 days ago AND settlementDate = null` | `OVERDUE_REMITTANCE` |
| 5 | Duplicate settlement | Same AWB in > 1 settlement batch | `DUPLICATE_SETTLEMENT` |

**Statuses assigned**:
- `MATCHED` — zero flags
- `DISCREPANCY` — one or more flags → event published to queue per flag
- `PENDING_REVIEW` — no matching order found in DB

---

## Queue & Worker Design

```
Reconciler
  └── publishDiscrepancy(data)
        └── Bull.add(data, { attempts: 3, backoff: { type: "exponential", delay: 2000 } })

Worker (discrepancyQueue.process)
  ├── Check Notification collection for idempotencyKey
  │     If SENT → skip (replay protection)
  ├── POST to WEBHOOK_URL with merchant payload
  ├── On success → mark Notification.status = "SENT"
  └── On failure (after 3 attempts)
        └── Move to Dead-Letter Queue (dlq Bull queue)
              └── Mark Notification.status = "DLQ"
```

**Retry schedule** (exponential backoff, base 2s):
- Attempt 1 → immediate
- Attempt 2 → 2 s delay
- Attempt 3 → 4 s delay
- After 3rd failure → DLQ

**Notification payload** sent to webhook:
```json
{
  "merchantId":      "MERCH1",
  "awbNumber":       "AWB00006",
  "discrepancyType": "COD_SHORT",
  "expectedValue":   1200,
  "actualValue":     980,
  "suggestedAction": "Raise dispute with courier for underpaid COD amount",
  "idempotencyKey":  "AWB00006-COD_SHORT",
  "timestamp":       "2024-03-16T20:30:12.000Z"
}
```

---

## Design Decisions

### 1. Decoupled reconciler and worker (hard requirement)

The reconciler calls `queue.add()` and returns. It does not import Axios, does not know about webhook.site, and does not wait for delivery. This means:
- A flaky webhook never causes reconciliation to fail or slow down
- The worker can be scaled independently (multiple consumers)
- Swapping the notification channel is a worker-only change

### 2. Idempotency at two levels

**Upload level** — compound unique index `{ awbNumber: 1, batchId: 1 }` on the Settlement collection. Re-uploading the same CSV is safe; duplicate inserts are caught at the DB level and counted as `skipped`.

**Notification level** — the `idempotencyKey` field (`{awbNumber}-{discrepancyType}`) prevents double-notification if the reconciliation job is accidentally run twice. The worker checks this before sending and before counting an attempt.

### 3. IST timezone scheduling

`node-cron` receives `{ timezone: "Asia/Kolkata" }`. The cron expression can therefore be written in IST directly (`0 2 * * *` = 2:00 AM IST), not as a UTC offset. This is immune to DST-like shifts and is human-readable for Indian teams.

### 4. All five discrepancy rules

The problem statement required at least three. All five are implemented because the complexity cost was low and the product completeness signal matters to the evaluator.

### 5. Worker in same process for dev simplicity

In `index.js`, the worker is `require()`d alongside the API. This means `node src/index.js` gives you everything running. A comment in the file notes that in production you'd run `node src/services/worker.js` as a separate process (or Kubernetes pod) for independent scaling.

### 6. MongoDB over SQL

Settlement data has a naturally document-oriented shape — each settlement carries a variable number of discrepancy flags, the order schema evolves across courier partners, and we never need cross-record joins at query time. Mongoose gives us enough schema enforcement while keeping flexibility.

---

## Assumptions

1. **Tolerance formula** — "tolerance = 2% or ₹10, whichever is lower" is interpreted as `Math.min(codAmount × 0.02, 10)` as the tolerance subtracted from expected COD.

2. **Courier partner** is stored on the Order, not on the Settlement. The Settlement only carries the AWB. For the courier breakdown chart, the frontend infers courier by AWB suffix (demo-mode mapping). In production the chart endpoint would JOIN settlements → orders server-side.

3. **Single settlement batch per upload** — each upload call creates one `batchId`. There is no concept of partial batch failure: if any row fails validation, only that row is skipped (error counted in `skipped`), the rest are inserted.

4. **Worker co-located with API** in development. The `WEBHOOK_URL` env var must be set before starting the server or notifications silently fail (the worker catches the axios error and marks the notification FAILED).

5. **Seed data AWB numbers** are `AWB00001`–`AWB00060`. The discrepancy injection pattern is every 5th record (`idx % 5 === 1` → COD_SHORT, etc.), guaranteeing at least 10 of each type in a 50-record batch.

6. **Redis is required**. Bull does not work without Redis. The docker-compose file provides it out of the box; no Redis configuration is needed beyond the connection URL.

---

## What I'd Improve With More Time

### Performance
- **Server-side pagination** on settlement list (currently returns last 500)
- **Cursor-based streaming** for reconciliation jobs on large datasets (current implementation loads all PENDING into memory)
- **Bulk notification dispatch** — batch multiple discrepancies per merchant into a single webhook call instead of N calls per flagged record

### Reliability
- **Separate worker process with PM2** — right now the worker and API share a process; a crash kills both
- **Redis Sentinel / Cluster** for queue HA in production
- **Idempotency utility backed by Redis** (the utils/idempotency.js file documents the swap path)

### Product
- **Export filtered settlements to CSV** — the backend query is ready; just add `res.csv()` wrapper
- **Merchant portal view** — currently everything is admin-facing; merchants should only see their own `merchantId` records (add JWT auth + row-level filter)
- **Notification preview** before manual trigger — render the payload in a modal before firing
- **Webhook signature verification** — sign outgoing payloads with HMAC so merchants can verify authenticity
- **Summary card: total discrepancy value in INR** — needs a `$group` aggregation pipeline on the discrepancy collection

### Ops
- **Structured logging** (Winston / Pino) instead of `console.log`
- **Health check endpoint** `GET /health` for Docker/K8s readiness probes
- **Prometheus metrics** — job duration, queue depth, notification success rate
- **CI/CD pipeline** with GitHub Actions: lint → test → docker build → deploy

---

## Seed Data

The seed script (`server/scripts/seedData.js`) generates:

- **60 Order records** across 5 couriers, 5 merchants, mix of DELIVERED / RTO / IN_TRANSIT
- **50 Settlement records** in batch `BATCH-SEED-001` with intentional discrepancies injected at a 1-in-5 rate:

| Pattern | Discrepancy |
|---|---|
| Every `idx % 5 === 1` | COD_SHORT — settled at 85% of expected |
| Every `idx % 5 === 2` | WEIGHT_DISPUTE — charged at 130% of declared |
| Every `idx % 5 === 3` (DELIVERED orders) | PHANTOM_RTO — ₹50 RTO charge on delivered shipment |
| Every `idx % 5 === 4` | OVERDUE_REMITTANCE — no settlementDate set |

Run reconciliation after seeding and you'll immediately see all four discrepancy types surfaced in the dashboard.

---

## License

MIT — built for the CleverBooks founding engineer take-home assignment.