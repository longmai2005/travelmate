require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const connect = require("../config/database");
const Destination = require("../models/Destination");
const destinations = require("../data/destinations");
async function seed() {
  await connect();
  for (const destination of destinations) {
    await Destination.updateOne(
      { slug: destination.slug },
      { $setOnInsert: destination },
      { upsert: true, runValidators: true },
    );
  }
  console.log(
    `Đã khởi tạo ${destinations.length} địa điểm mẫu; giữ nguyên các bản ghi đã được chỉnh sửa.`,
  );
}
seed()
  .catch((e) => {
    console.error("Lỗi seed:", e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
