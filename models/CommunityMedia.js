const mongoose = require("mongoose");
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true }, data: { type: Buffer, required: true, select: false }, bytes: { type: Number, required: true } }, { timestamps: true });
module.exports = mongoose.model("CommunityMedia", schema);
