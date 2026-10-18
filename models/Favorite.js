const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ userId: 1, destinationId: 1 }, { unique: true });
module.exports = mongoose.model("Favorite", schema);
