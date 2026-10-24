const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true },
  baseVersion: { type: Number, required: true },
  body: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ userId: 1, tripId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("TripDraft", schema);
