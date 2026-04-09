const express = require("express");
const router  = express.Router();
const Job     = require("../models/Job");

router.get("/", async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).limit(10);
  res.json(jobs);
});

module.exports = router;