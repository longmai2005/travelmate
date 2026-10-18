const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", default: null },
  subject: { type: String, required: true, maxlength: 150 },
  type: { type: String, enum: ["price", "address", "closed", "other"], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ["open", "in_review", "resolved", "dismissed"], default: "open" },
  history: [{ status: String, reply: { type: String, maxlength: 1000 }, adminName: String, createdAt: { type: Date, default: Date.now }, _id: false }],
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model("Feedback", schema);
