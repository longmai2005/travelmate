require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const connect = require("../config/database");
async function main() {
  await connect();
  const counts = {};
  for (const name of ["users", "destinations", "itineraries", "favorites", "activities", "feedbacks", "tripcomments", "tripinvitations"])
    counts[name] = await mongoose.connection.db.collection(name).countDocuments();
  console.log(JSON.stringify({ host: mongoose.connection.host, database: mongoose.connection.name, collections: counts }, null, 2));
}
main().catch(() => { console.error("Không đọc được MongoDB. Kiểm tra MONGO_URI và quyền kết nối; không chia sẻ URI có mật khẩu."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
