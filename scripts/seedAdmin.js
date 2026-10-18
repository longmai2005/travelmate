require("dotenv").config({ quiet: true });
const readline = require("node:readline/promises");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connect = require("../config/database");
const User = require("../models/User");
async function seedAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const email = (
      process.env.ADMIN_EMAIL || (await rl.question("Email quản trị: "))
    )
      .trim()
      .toLowerCase();
    const fullName = (
      process.env.ADMIN_NAME || (await rl.question("Tên quản trị: "))
    ).trim();
    // Ưu tiên biến môi trường từ trình quản lý bí mật; không ghi mật khẩu vào mã nguồn.
    const password = process.env.ADMIN_PASSWORD;
    if (!password)
      throw new Error(
        "Hãy đặt ADMIN_PASSWORD trong môi trường trước khi chạy (xem README).",
      );
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !fullName ||
      fullName.length > 100 ||
      password.length < 12 ||
      Buffer.byteLength(password) > 72
    )
      throw new Error(
        "Email, họ tên không hợp lệ hoặc mật khẩu chưa đủ 12 ký tự / vượt 72 byte.",
      );
    await connect();
    await User.findOneAndUpdate(
      { email },
      {
        fullName,
        passwordHash: await bcrypt.hash(password, 12),
        role: "admin",
        isActive: true,
        lockedAt: null,
        lockedBy: null,
        lockReason: "",
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
    console.log("Đã tạo / cập nhật tài khoản quản trị.");
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}
seedAdmin().catch((error) => {
  console.error("Lỗi:", error.message);
  process.exitCode = 1;
});
