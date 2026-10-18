const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true, maxlength: 100 },
  text: { type: String, required: true, maxlength: 1000 },
  kind: { type: String, enum: ["comment", "suggestion"], default: "comment" },
  createdAt: { type: Date, default: Date.now },
});
schema.index({ tripId: 1, _id: -1 });
module.exports = mongoose.model("TripComment", schema);
