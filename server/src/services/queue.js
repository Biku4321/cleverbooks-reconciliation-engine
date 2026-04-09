const Bull = require("bull");
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const discrepancyQueue = new Bull("discrepancy", redisUrl);
const dlq              = new Bull("dlq",          redisUrl);

async function publishDiscrepancy(data) {
  await discrepancyQueue.add(data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: false,
  });
}

module.exports = { discrepancyQueue, dlq, publishDiscrepancy };