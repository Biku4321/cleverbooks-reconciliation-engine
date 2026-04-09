const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  awbNumber:    { type: String },
  merchantId:   { type: String },
  discrepancyType: { type: String },
  payload:      { type: Object },
  status:       { type: String, enum: ["SENT","FAILED","RETRYING","DLQ"], default: "RETRYING" },
  attempts:     { type: Number, default: 0 },
  lastAttemptAt:{ type: Date },
  idempotencyKey:{ type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model("Notification", NotificationSchema);