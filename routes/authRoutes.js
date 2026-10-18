const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");
const User = require("../models/User");
const recordActivity = require("../utils/activity");
const { fail, text } = require("../utils/validation");
const { requireAuth } = require("../middleware/authMiddleware");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút." },
});
const safeUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
});
function credentials(body) {
  const email = text(body.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("Địa chỉ email không hợp lệ.");
  const password = body.password;
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    fail("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.");
  return { email, password };
}
async function establish(req, user) {
  user.lastLoginAt = new Date();
  await user.save();
  await new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  req.session.userId = user._id.toString();
  req.session.authVersion = user.sessionVersion || 0;
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  await new Promise((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );
  return { user: safeUser(user), csrfToken: req.session.csrfToken };
}
router.get("/csrf", (req, res) => {
  req.session.csrfToken ||= crypto.randomBytes(32).toString("hex");
  res.json({ csrfToken: req.session.csrfToken });
});
router.get("/me", async (req, res) => {
  const user = req.session.userId
    ? await User.findById(req.session.userId).select("+sessionVersion")
    : null;
  const valid =
    user &&
    user.isActive !== false &&
    (req.session.authVersion || 0) === (user.sessionVersion || 0);
  res.json({ user: valid ? safeUser(user) : null });
});
router.post("/register", limiter, async (req, res) => {
  const { email, password } = credentials(req.body);
  const fullName = text(req.body.fullName, "Họ tên", 100);
  if (password !== req.body.confirmPassword)
    fail("Mật khẩu xác nhận chưa khớp.");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    fullName,
    passwordHash,
    role: "user",
  });
  await recordActivity(user, "user.registered", user);
  res.status(201).json(await establish(req, user));
});
router.post("/login", limiter, async (req, res) => {
  const { email, password } = credentials(req.body);
  const user = await User.findOne({ email }).select(
    "+passwordHash +sessionVersion",
  );
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    fail("Email hoặc mật khẩu chưa đúng.", 401);
  if (user.isActive === false)
    fail("Tài khoản đang bị tạm khóa. Vui lòng liên hệ quản trị viên.", 403);
  res.json(await establish(req, user));
});
router.post("/logout", requireAuth, async (req, res) => {
  await new Promise((resolve, reject) =>
    req.session.destroy((error) => (error ? reject(error) : resolve())),
  );
  res.clearCookie("travelmate.sid", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Đã đăng xuất." });
});
module.exports = router;
