const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  role: { type: String, enum: ["editor", "viewer"], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});
schema.index({ tripId: 1, email: 1 }, { unique: true });
module.exports = mongoose.model("TripInvitation", schema);
