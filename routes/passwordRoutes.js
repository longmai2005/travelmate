const router = require("express").Router();
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const User = require("../models/User");
const Reset = require("../models/PasswordReset");
const { text, fail } = require("../utils/validation");
const mailer = require("../utils/mailer");
const limiter = rateLimit({ windowMs: 15 * 60000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Bạn đã thử nhiều lần. Vui lòng thử lại sau 15 phút." } });
function origin() {
  let url;
  try { url = new URL(process.env.APP_ORIGIN); } catch { fail("Dịch vụ email chưa được cấu hình.", 503); }
  if ((url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")) || url.username || url.password) fail("Dịch vụ email chưa được cấu hình.", 503);
  return url.origin;
}
router.get("/config", (req, res) => res.json({ passwordRecovery: !!req.app.locals.sendResetEmail || mailer.configured() }));
router.post("/forgot-password", limiter, async (req, res) => {
  const email = text(req.body.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email không hợp lệ.");
  if (!req.app.locals.sendResetEmail && !mailer.configured()) fail("Email khôi phục chưa được kích hoạt. Vui lòng liên hệ quản trị viên hoặc thử lại sau.", 503);
  const base = origin();
  // Check provider configuration for every address equally, before account lookup.
  if (!req.app.locals.sendResetEmail && (await mailer.deliveryHealth()).blocking)
    fail("Dịch vụ email khôi phục đang tạm gián đoạn. Vui lòng thử lại sau hoặc liên hệ quản trị viên.", 503);
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({ email, isActive: { $ne: false } });
  // Always return the same response and a minimum response time.
  await Promise.all([
    new Promise(resolve => setTimeout(resolve, 1200)),
    (async () => {
      if (!user) return;
      await Reset.findOneAndUpdate({ userId: user._id }, { tokenHash: hash, expiresAt: new Date(Date.now() + 15 * 60000) }, { upsert: true, runValidators: true });
      // Dispatch without making response time depend on recipient/provider latency.
      Promise.resolve().then(() => (req.app.locals.sendResetEmail || mailer.sendResetEmail)(email, `${base}/reset-password#${token}`))
        .then(() => console.info("Password recovery email: accepted by provider"))
        .catch(error => console.error("Password recovery email:", JSON.stringify(mailer.safeDetails(error))));
    })(),
  ]);
  res.status(202).json({ message: "Nếu email thuộc tài khoản hợp lệ, bạn sẽ nhận được liên kết khôi phục. Hãy kiểm tra cả thư mục spam." });
});
router.post("/reset-password", limiter, async (req, res) => {
  const token = req.body.token;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) fail("Liên kết không hợp lệ hoặc đã hết hạn.");
  const password = req.body.password;
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72 || password !== req.body.confirmPassword) fail("Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte UTF-8 và khớp xác nhận.");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(password, 12);
  const reset = await Reset.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!reset) fail("Liên kết không hợp lệ, đã dùng hoặc hết hạn.");
  const user = await User.findOneAndUpdate({ _id: reset.userId, isActive: { $ne: false } }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } });
  if (!user) fail("Tài khoản không thể khôi phục lúc này.");
  if (req.session.userId) await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  await require("../utils/activity")(user, "user.password_changed", user);
  res.json({ message: "Đã đổi mật khẩu và vô hiệu hóa các phiên cũ. Vui lòng đăng nhập lại." });
});
module.exports = router;
