const express = require("express");
const router  = express.Router();
const Notification = require("../models/Notification");

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const notifs = await Notification.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json(notifs);
});

module.exports = router;