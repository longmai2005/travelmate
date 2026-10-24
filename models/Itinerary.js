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
    ownerName: { type: String, maxlength: 100, default: "" },
    lastPlanAuthor: { type: String, maxlength: 100, default: "" },
    lastPlanSavedAt: { type: Date, default: null },
    collaborators: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, role: { type: String, enum: ["editor", "viewer"], required: true }, _id: false }],
    participants: [{ id: { type: String, required: true }, name: { type: String, required: true, maxlength: 80 }, _id: false }],
    actualExpenses: [{ id: String, label: String, category: String, date: String, amountVnd: Number, paidBy: String, splitBetween: [String], note: String, _id: false }],
    settlements: [{ id: String, from: String, to: String, amountVnd: Number, note: String, _id: false }],
    expenses: [{
      label: { type: String, required: true, maxlength: 120 },
      category: { type: String, enum: ["accommodation", "transport", "food", "other"], required: true },
      amountVnd: { type: Number, min: 0, max: 1e9, required: true, validate: Number.isSafeInteger },
      scope: { type: String, enum: ["trip", "person"], default: "trip" },
      _id: false,
    }],
    shareTokenHash: { type: String, select: false },
    sharedAt: { type: Date, default: null },
    planHistory: { type: [{ version: Number, savedAt: Date, authorName: String, plan: mongoose.Schema.Types.Mixed, _id: false }], select: false, default: [] },
    days: [day],
  },
  { timestamps: true, optimisticConcurrency: true },
);
schema.index({ shareTokenHash: 1 }, { unique: true, sparse: true });
schema.index({ "collaborators.userId": 1, updatedAt: -1 });
module.exports = mongoose.model("Itinerary", schema);
