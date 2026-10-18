const User = require("../models/User");
const { fail } = require("../utils/validation");
async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    if (req.sessionExpired) {
      const error = new Error("Phiên đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.");
      error.status = 401; error.code = "SESSION_EXPIRED"; throw error;
    }
    fail("Bạn hãy đăng nhập để tiếp tục.", 401);
  }
  const user = await User.findById(req.session.userId).select(
    "+sessionVersion",
  );
  if (!user) fail("Phiên đăng nhập không còn hợp lệ.", 401);
  if (user.isActive === false)
    fail("Tài khoản đang bị tạm khóa. Vui lòng liên hệ quản trị viên.", 403);
  if ((req.session.authVersion || 0) !== (user.sessionVersion || 0))
    fail("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.", 401);
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") fail("Bạn không có quyền quản trị.", 403);
  next();
}
module.exports = { requireAuth, requireAdmin };
