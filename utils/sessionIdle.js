const limits = Object.freeze({ user: 5 * 60 * 1000, admin: 10 * 60 * 1000 });
function idleLimit(role) { return role === "admin" ? limits.admin : limits.user; }
function sessionState(session, now = Date.now()) {
  const timeoutMs = idleLimit(session.idleRole);
  const lastActivityAt = session.lastActivityAt;
  const expired = !Number.isFinite(lastActivityAt) || lastActivityAt > now + 1000 || now - lastActivityAt >= timeoutMs;
  return { timeoutMs, expiresAt: Number.isFinite(lastActivityAt) ? lastActivityAt + timeoutMs : now, serverNow: now, generation: session.publicGeneration, expired };
}
async function expireSession(req, res) {
  res.setHeader("Cache-Control", "no-store");
  await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  res.clearCookie("travelmate.sid", { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  req.sessionExpired = true;
}
async function enforceIdle(req, res, next) {
  if (req.session?.userId && sessionState(req.session).expired) await expireSession(req, res);
  if (req.sessionExpired && req.path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return res.status(401).json({ code: "SESSION_EXPIRED", message: "Phiên đã hết hạn do không hoạt động. Vui lòng đăng nhập lại." });
  }
  next();
}
module.exports = { limits, idleLimit, sessionState, enforceIdle };
