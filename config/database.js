const mongoose = require("mongoose");

async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error("Thiếu MONGO_URI trong .env.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}
module.exports = connectDatabase;
