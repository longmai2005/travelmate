const mongoose = require("mongoose");
const categories = [
  "beach",
  "mountain",
  "nature",
  "historical",
  "cultural",
  "entertainment",
  "food",
];
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true },
    province: { type: String, required: true, maxlength: 100 },
    region: {
      type: String,
      enum: ["north", "central", "south"],
      required: true,
    },
    category: { type: String, enum: categories, required: true },
    shortDescription: { type: String, required: true, maxlength: 300 },
    description: { type: String, required: true, maxlength: 5000 },
    imageUrl: { type: String, required: true },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    estimatedCostPerPersonVnd: {
      type: Number,
      min: 0,
      default: null,
      validate: (v) => v === null || Number.isSafeInteger(v),
    },
    recommendedDurationHours: { type: Number, min: 0.25, max: 168, default: 2 },
    tags: [{ type: String, maxlength: 60 }],
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ isActive: 1, province: 1, category: 1 });
module.exports = mongoose.model("Destination", schema);
module.exports.categories = categories;
