require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const connectDB = require("./config/db");

const app = express();
app.use(cors({
  origin: ["https://cleverbooks-reconciliation-engine.vercel.app"] 
}));
app.use(express.json());

connectDB();

app.use("/api/settlements",   require("./routes/settlements"));
app.use("/api/jobs",          require("./routes/jobs"));
app.use("/api/notifications", require("./routes/notifications"));

require("./services/scheduler");


require("./services/worker");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));