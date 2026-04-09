const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({
  startedAt:       { type: Date, default: Date.now },
  completedAt:     { type: Date },
  status:          { type: String, enum: ["RUNNING","DONE","FAILED"], default: "RUNNING" },
  recordsTotal:    { type: Number, default: 0 },
  recordsMatched:  { type: Number, default: 0 },
  discrepancies:   { type: Number, default: 0 },
  triggeredBy:     { type: String, enum: ["SCHEDULER","MANUAL"], default: "SCHEDULER" },
  error:           { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Job", JobSchema);