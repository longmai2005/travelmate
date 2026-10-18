const mongoose = require("mongoose");
const item = new mongoose.Schema(
  {
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
    visitTime: { type: String, default: "" },
    note: { type: String, maxlength: 500, default: "" },
    customCostPerPersonVnd: {
      type: Number,
      min: 0,
      max: 1e9,
      default: null,
      validate: (value) => value === null || Number.isSafeInteger(value),
    },
    order: { type: Number, min: 0, required: true },
  },
  { _id: false },
);
const day = new mongoose.Schema(
  {
    date: { type: String, required: true },
    notes: { type: String, maxlength: 500, default: "" },
    items: [item],
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    travelers: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: Number.isSafeInteger,
    },
    budgetLimitVnd: {
      type: Number,
      min: 0,
      max: 1e12,
      required: true,
      validate: Number.isSafeInteger,
    },
    notes: { type: String, maxlength: 2000, default: "" },
    days: [day],
  },
  { timestamps: true },
);
module.exports = mongoose.model("Itinerary", schema);
