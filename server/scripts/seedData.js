require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Order      = require("../src/models/Order");
const Settlement = require("../src/models/Settlement");

const COURIERS = ["shiprocket","delhivery","bluedart","dtdc","kwikship"];
const STATUSES = ["DELIVERED","DELIVERED","DELIVERED","RTO","IN_TRANSIT"];
const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cleverbooks");
  await Order.deleteMany({});
  await Settlement.deleteMany({});

  const orders = [];
  for (let i = 1; i <= 60; i++) {
    const status   = STATUSES[i % STATUSES.length];
    const cod      = i % 3 === 0 ? 0 : rand(200, 3000);
    const delDate  = status === "DELIVERED" ? daysAgo(rand(3, 20)) : null;
    orders.push({
      awbNumber:      `AWB${String(i).padStart(5,"0")}`,
      merchantId:     `MERCH${(i % 5) + 1}`,
      courierPartner: COURIERS[i % COURIERS.length],
      orderStatus:    status,
      codAmount:      cod,
      declaredWeight: rand(0.5, 10),
      orderDate:      daysAgo(rand(20, 60)),
      deliveryDate:   delDate,
    });
  }
  await Order.insertMany(orders);
  console.log("Orders seeded:", orders.length);


  const batchId = "BATCH-SEED-001";
  const settlements = orders.slice(0, 50).map((o, idx) => {
    let settledCod   = o.codAmount;
    let chargedWt    = o.declaredWeight;
    let rtoCharge    = 0;
    let settlementDate = daysAgo(rand(1, 5));

    
    if (idx % 5 === 1) settledCod = +(o.codAmount * 0.85).toFixed(2);  // COD_SHORT
    if (idx % 5 === 2) chargedWt  = +(o.declaredWeight * 1.3).toFixed(2); // WEIGHT_DISPUTE
    if (idx % 5 === 3 && o.orderStatus === "DELIVERED") rtoCharge = 50;    // PHANTOM_RTO
    if (idx % 5 === 4) settlementDate = null;                               

    return {
      awbNumber:        o.awbNumber,
      batchId,
      settledCodAmount: settledCod,
      chargedWeight:    chargedWt,
      forwardCharge:    rand(40, 120),
      rtoCharge,
      codHandlingFee:   o.codAmount > 0 ? +(o.codAmount * 0.02).toFixed(2) : 0,
      settlementDate,
    };
  });

  await Settlement.insertMany(settlements);
  console.log("Settlements seeded:", settlements.length);
  console.log("Done! Run reconciliation to see discrepancies.");
  process.exit(0);
}

seed().catch(console.error);