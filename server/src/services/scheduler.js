const cron = require("node-cron");
const { runReconciliation } = require("./reconciler");
const Job = require("../models/Job");

const cronExpr = process.env.RECONCILE_CRON || "30 20 * * *";

cron.schedule(cronExpr, async () => {
  console.log("Scheduled reconciliation starting...");
  const job = await Job.create({ triggeredBy: "SCHEDULER" });
  try {
    const stats = await runReconciliation();
    job.set({ status: "DONE", completedAt: new Date(), ...stats });
  } catch (err) {
    job.set({ status: "FAILED", error: err.message });
  }
  await job.save();
  console.log("Reconciliation done:", job.toObject());
}, { timezone: "Asia/Kolkata" });

console.log(`Scheduler registered: ${cronExpr} (IST)`);