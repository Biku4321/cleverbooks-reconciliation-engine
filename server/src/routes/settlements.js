const express  = require("express");
const multer   = require("multer");
const { parse }= require("csv-parse/sync");
const router   = express.Router();
const Settlement = require("../models/Settlement");
const Order      = require("../models/Order");
const { runReconciliation } = require("../services/reconciler");
const Job        = require("../models/Job");
const rateLimiter= require("../middleware/rateLimiter");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5_000_000 } });

router.post("/upload", rateLimiter, upload.single("file"), async (req, res) => {
  try {
    let records = [];
    if (req.file) {
      const text = req.file.buffer.toString("utf8");
      records = parse(text, { columns: true, skip_empty_lines: true, bom: true });
    } else if (req.body.records) {
      records = req.body.records;
    } else {
      return res.status(400).json({ error: "No file or records provided" });
    }

    if (records.length > 1000) return res.status(400).json({ error: "Max 1000 rows per batch" });

    const batchId = `BATCH-${Date.now()}`;
    let inserted = 0, skipped = 0;

    for (const r of records) {
      try {
        await Settlement.create({
          awbNumber:        r.awbNumber,
          batchId,
          settledCodAmount: Number(r.settledCodAmount || 0),
          chargedWeight:    Number(r.chargedWeight),
          forwardCharge:    Number(r.forwardCharge || 0),
          rtoCharge:        Number(r.rtoCharge || 0),
          codHandlingFee:   Number(r.codHandlingFee || 0),
          settlementDate:   r.settlementDate ? new Date(r.settlementDate) : null,
        });
        inserted++;
      } catch (e) {
        skipped++;  
      }
    }

    res.json({ batchId, inserted, skipped, total: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.courier) filter.awbNumber = { $in: await getAwbsByCourier(req.query.courier) };
    const settlements = await Settlement.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json(settlements);
  } catch (err) {
    console.error("GET /api/settlements Error:", err.message);
    res.status(500).json({ error: "Database error occurred while fetching." });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const s = await Settlement.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Not found" });
    const order = await Order.findOne({ awbNumber: s.awbNumber });
    res.json({ settlement: s, order });
  } catch (err) {
    console.error("GET /:id Error:", err.message);
    res.status(500).json({ error: "Failed to fetch settlement detail." });
  }
});

router.post("/reconcile", async (req, res) => {
  const job = await Job.create({ triggeredBy: "MANUAL" });
  try {
    const stats = await runReconciliation();
    job.set({ status: "DONE", completedAt: new Date(), ...stats });
    await job.save();
    res.json({ job, stats });
  } catch (err) {
    job.set({ status: "FAILED", error: err.message });
    await job.save();
    res.status(500).json({ error: err.message });
  }
});

async function getAwbsByCourier(courier) {
  const orders = await Order.find({ courierPartner: courier }, "awbNumber");
  return orders.map(o => o.awbNumber);
}

module.exports = router;