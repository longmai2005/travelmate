const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
  authorName: { type: String, required: true, maxlength: 100 },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, maxlength: 120, required: true },
  content: { type: String, maxlength: 2000, required: true },
  visitedOn: { type: String, required: true },
  photoId: { type: mongoose.Schema.Types.ObjectId, default: null },
  photoTakenOn: { type: String, default: "" },
  photoBytes: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "approved", "rejected", "withdrawn"], default: "pending" },
  moderationReason: { type: String, maxlength: 1000, default: "" },
  moderatedBy: { type: String, default: "" },
  moderatedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ userId: 1, destinationId: 1 }, { unique: true });
schema.index({ destinationId: 1, status: 1, createdAt: -1 });
schema.index({ status: 1, updatedAt: -1 });
module.exports = mongoose.model("DestinationReview", schema);
