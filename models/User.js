const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0, select: false },
    lastLoginAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    lockReason: { type: String, maxlength: 500, default: "" },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("User", userSchema);
