const Order      = require("../models/Order");
const Settlement = require("../models/Settlement");
const { publishDiscrepancy } = require("./queue");

const TOL_PCT  = parseFloat(process.env.COD_TOLERANCE_PCT)  / 100 || 0.02;
const TOL_FLAT = parseFloat(process.env.COD_TOLERANCE_FLAT) || 10;
const WEIGHT_OVER = parseFloat(process.env.WEIGHT_OVERAGE_PCT) / 100 || 0.10;
const OVERDUE_DAYS = parseInt(process.env.SETTLEMENT_OVERDUE_DAYS) || 14;

async function runReconciliation() {
  const settlements = await Settlement.find({ status: "PENDING" });
  // FIXED: Changed keys to recordsTotal and recordsMatched
  const stats = { recordsTotal: settlements.length, recordsMatched: 0, discrepancies: 0 };

  for (const s of settlements) {
    const order = await Order.findOne({ awbNumber: s.awbNumber });
    if (!order) {
      s.status = "PENDING_REVIEW";
      s.discrepancies = ["NO_ORDER_FOUND"];
      await s.save();
      continue;
    }

    const flags = [];

    // Rule 1: COD short remittance
    if (order.codAmount > 0) {
      const tolerance = Math.min(order.codAmount * TOL_PCT, TOL_FLAT);
      if (s.settledCodAmount < order.codAmount - tolerance) {
        flags.push("COD_SHORT");
      }
    }

    // Rule 2: Weight dispute
    if (s.chargedWeight > order.declaredWeight * (1 + WEIGHT_OVER)) {
      flags.push("WEIGHT_DISPUTE");
    }

    // Rule 3: Phantom RTO charge
    if (s.rtoCharge > 0 && order.orderStatus === "DELIVERED") {
      flags.push("PHANTOM_RTO");
    }

    // Rule 4: Overdue remittance
    if (order.deliveryDate && !s.settlementDate) {
      const daysSince = (Date.now() - new Date(order.deliveryDate)) / 86400000;
      if (daysSince > OVERDUE_DAYS) flags.push("OVERDUE_REMITTANCE");
    }

    // Rule 5: Duplicate settlement
    const dupeCount = await Settlement.countDocuments({ awbNumber: s.awbNumber });
    if (dupeCount > 1) flags.push("DUPLICATE_SETTLEMENT");

    s.discrepancies = flags;
    s.processedAt   = new Date();

    if (flags.length === 0) {
      s.status = "MATCHED";
      stats.recordsMatched++; // FIXED: Updated counter name
    } else {
      s.status = "DISCREPANCY";
      stats.discrepancies++;
      for (const flag of flags) {
        await publishDiscrepancy({
          awbNumber:      s.awbNumber,
          merchantId:     order.merchantId,
          discrepancyType: flag,
          expected:       getExpected(flag, order, s),
          actual:         getActual(flag, order, s),
          suggestedAction: getSuggestedAction(flag),
        });
      }
    }

    await s.save();
  }

  return stats;
}

function getExpected(flag, order, s) {
  if (flag === "COD_SHORT")           return order.codAmount;
  if (flag === "WEIGHT_DISPUTE")      return order.declaredWeight;
  if (flag === "PHANTOM_RTO")         return 0;
  if (flag === "OVERDUE_REMITTANCE")  return `Within ${OVERDUE_DAYS} days`;
  return null;
}

function getActual(flag, order, s) {
  if (flag === "COD_SHORT")       return s.settledCodAmount;
  if (flag === "WEIGHT_DISPUTE")  return s.chargedWeight;
  if (flag === "PHANTOM_RTO")     return s.rtoCharge;
  if (flag === "OVERDUE_REMITTANCE") return "Not yet settled";
  return null;
}

function getSuggestedAction(flag) {
  const map = {
    COD_SHORT:          "Raise dispute with courier for underpaid COD amount",
    WEIGHT_DISPUTE:     "File weight dispute with supporting proof of weight",
    PHANTOM_RTO:        "Request reversal of RTO charge — order was delivered",
    OVERDUE_REMITTANCE: "Contact courier to initiate overdue remittance",
    DUPLICATE_SETTLEMENT: "Verify and request refund for duplicate settlement",
    NO_ORDER_FOUND:     "Match AWB to internal order system manually",
  };
  return map[flag] || "Review manually";
}

module.exports = { runReconciliation };