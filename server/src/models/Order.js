const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  awbNumber:      { type: String, required: true, unique: true, index: true },
  merchantId:     { type: String, required: true },
  courierPartner: { type: String, required: true },
  orderStatus:    { type: String, enum: ["DELIVERED","RTO","IN_TRANSIT","LOST"] },
  codAmount:      { type: Number, default: 0 },
  declaredWeight: { type: Number, required: true },
  orderDate:      { type: Date },
  deliveryDate:   { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);