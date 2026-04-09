require("dotenv").config();
const axios        = require("axios");
const { v4: uuid } = require("uuid");
const { discrepancyQueue, dlq } = require("./queue");
const Notification = require("../models/Notification");
const connectDB    = require("../config/db");
const mongoose     = require("mongoose");

if (mongoose.connection.readyState === 0) {
  connectDB();
}

discrepancyQueue.process(async (job) => {
  const data = job.data;
  const idempotencyKey = `${data.awbNumber}-${data.discrepancyType}`;

  let notif = await Notification.findOne({ idempotencyKey });
  if (notif && notif.status === "SENT") {
    console.log("Duplicate — already sent:", idempotencyKey);
    return;
  }
  if (!notif) {
    notif = new Notification({ ...data, idempotencyKey });
  }

  notif.attempts++;
  notif.lastAttemptAt = new Date();
  notif.status = "RETRYING";
  await notif.save();

  await axios.post(process.env.WEBHOOK_URL, {
    merchantId:      data.merchantId,
    awbNumber:       data.awbNumber,
    discrepancyType: data.discrepancyType,
    expectedValue:   data.expected,
    actualValue:     data.actual,
    suggestedAction: data.suggestedAction,
    idempotencyKey,
    timestamp:       new Date().toISOString(),
  }, {
    headers: { "X-Idempotency-Key": idempotencyKey }
  });

  notif.status = "SENT";
  await notif.save();
  console.log("Notification sent:", idempotencyKey);
});

discrepancyQueue.on("failed", async (job, err) => {
  console.error("Job failed:", job.id, err.message);
  if (job.attemptsMade >= 3) {
    await dlq.add({ ...job.data, failReason: err.message });
    await Notification.findOneAndUpdate(
      { idempotencyKey: `${job.data.awbNumber}-${job.data.discrepancyType}` },
      { status: "DLQ" }
    );
  }
});

console.log("Worker listening on discrepancy queue...");