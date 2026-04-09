const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema({
  awbNumber:        { type: String, required: true, index: true },
  batchId:          { type: String, required: true },
  settledCodAmount: { type: Number, default: 0 },
  chargedWeight:    { type: Number, required: true },
  forwardCharge:    { type: Number, default: 0 },
  rtoCharge:        { type: Number, default: 0 },
  codHandlingFee:   { type: Number, default: 0 },
  settlementDate:   { type: Date, default: null },

  
  status:           { type: String, enum: ["PENDING","MATCHED","DISCREPANCY","PENDING_REVIEW"], default: "PENDING" },
  discrepancies:    [{ type: String }],  
  processedAt:      { type: Date },
}, { timestamps: true });

SettlementSchema.index({ awbNumber: 1, batchId: 1 }, { unique: true });

module.exports = mongoose.model("Settlement", SettlementSchema);