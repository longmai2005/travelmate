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
    imageCredit: { type: String, maxlength: 500, default: "" },
    imageSourceUrl: { type: String, maxlength: 2000, default: "" },
    imageLicense: { type: String, maxlength: 100, default: "" },
    imageLicenseUrl: { type: String, maxlength: 2000, default: "" },
    imageTakenOn: { type: String, maxlength: 10, default: "" },
    imageKind: { type: String, enum: ["place", "area", "illustration"], default: "illustration" },
    searchText: { type: String, select: false },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    address: { type: String, maxlength: 300, default: "" },
    openingHours: { type: String, maxlength: 300, default: "" },
    sourceUrl: { type: String, maxlength: 2000, default: "" },
    verifiedOn: { type: String, default: "" },
    priceNote: { type: String, maxlength: 500, default: "" },
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
    contentVersion: { type: Number, default: 0 },
    editorial: {
      type: new mongoose.Schema({
        version: { type: Number, default: 0 },
        status: { type: String, enum: ["draft", "pending", "published"], default: "published" },
        draft: mongoose.Schema.Types.Mixed,
        baseContentVersion: Number,
        editedBy: String,
        editedAt: Date,
        note: { type: String, maxlength: 1000, default: "" },
        history: [{ body: mongoose.Schema.Types.Mixed, publishedBy: String, publishedAt: Date }],
      }, { _id: false }),
      select: false,
    },
  },
  { timestamps: true },
);
schema.index({ isActive: 1, province: 1, category: 1 });
schema.pre("validate", function () {
  this.searchText = require("../utils/destinationSearch")([this.name, this.province, this.shortDescription, ...(this.tags || [])].join(" "));
});
module.exports = mongoose.model("Destination", schema);
module.exports.categories = categories;
