const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorName: { type: String, required: true, maxlength: 160 },
  action: { type: String, required: true, enum: ["itinerary.restored", "destination.review_moderated", "destination.review_submitted", "destination.review_withdrawn", "destination.draft_created", "destination.draft_updated", "destination.published", "user.preferences_updated", "user.registered", "user.profile_updated", "user.password_changed", "feedback.created", "feedback.updated", "user.locked", "user.unlocked", "itinerary.created", "itinerary.updated", "itinerary.deleted", "itinerary.shared", "itinerary.unshared", "destination.created", "destination.updated", "destination.hidden", "destination.restored"] },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetLabel: { type: String, required: true, maxlength: 160 },
  detail: { type: String, maxlength: 500, default: "" },
  createdAt: { type: Date, default: Date.now, expires: 90 * 86400 },
});
schema.index({ action: 1, _id: -1 });
module.exports = mongoose.model("Activity", schema);
