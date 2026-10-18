const router = require("express").Router();
const crypto = require("node:crypto");
const Itinerary = require("../models/Itinerary");
const User = require("../models/User");
const Invitation = require("../models/TripInvitation");
const Comment = require("../models/TripComment");
const { accessible, roleFor } = require("../utils/tripAccess");
const { objectId, text, fail } = require("../utils/validation");
const record = require("../utils/activity");
function role(value) { if (!["editor", "viewer"].includes(value)) fail("Vai trò phải là người chỉnh sửa hoặc người xem."); return value; }
async function invitationFor(req) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) fail("Lời mời không hợp lệ hoặc đã hết hạn.", 404);
  const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const invitation = await Invitation.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!invitation) fail("Lời mời không hợp lệ hoặc đã hết hạn.", 404);
  if (invitation.email !== req.user.email) fail("Lời mời dành cho tài khoản email khác. Hãy đăng nhập đúng tài khoản được mời.", 403);
  return invitation;
}
router.get("/invitations/:token", async (req, res) => {
  const invitation = await invitationFor(req);
  const trip = await Itinerary.findById(invitation.tripId).select("title ownerName userId");
  if (!trip || !await User.exists({ _id: trip.userId, isActive: { $ne: false } })) fail("Chuyến đi không còn nhận lời mời.", 404);
  res.json({ invitation: { title: trip.title, ownerName: trip.ownerName, role: invitation.role, expiresAt: invitation.expiresAt } });
});
router.post("/invitations/:token/accept", async (req, res) => {
  const invitation = await invitationFor(req);
  let trip = await Itinerary.findById(invitation.tripId);
  if (!trip || !await User.exists({ _id: trip.userId, isActive: { $ne: false } })) fail("Chuyến đi không còn nhận lời mời.", 404);
  if (!roleFor(trip, req.user._id)) {
    trip = await Itinerary.findOneAndUpdate({ _id: trip._id, "collaborators.userId": { $ne: req.user._id },
      $expr: { $lt: [{ $size: { $ifNull: ["$collaborators", []] } }, 20] } },
      { $push: { collaborators: { userId: req.user._id, role: invitation.role } }, $inc: { __v: 1 } }, { returnDocument: "after" });
    if (!trip) fail("Nhóm đã thay đổi hoặc đủ 20 cộng tác viên. Hãy liên hệ chủ chuyến đi.", 409);
  }
  await Invitation.deleteOne({ _id: invitation._id });
  await record(req.user, "itinerary.updated", trip, "Tham gia chuyến đi qua lời mời");
  res.json({ itineraryId: trip._id, message: "Đã tham gia chuyến đi." });
});
router.get("/:id/team", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  const ids = trip.collaborators.map(m => m.userId);
  const [users, invitations] = await Promise.all([
    User.find({ _id: { $in: ids } }).select("fullName email isActive").lean(),
    Invitation.find({ tripId: trip._id, expiresAt: { $gt: new Date() } }).select("email role expiresAt").lean(),
  ]);
  res.json({ members: trip.collaborators.map(m => ({ userId: m.userId, role: m.role, user: users.find(u => String(u._id) === String(m.userId)) || null })), invitations });
});
router.post("/:id/invitations", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  const email = text(req.body.email, "Email người được mời", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === req.user.email) fail("Nhập email hợp lệ của người khác.");
  const selectedRole = role(req.body.role);
  if (trip.collaborators.length >= 20) fail("Chuyến đi có tối đa 20 cộng tác viên.");
  if (await Invitation.countDocuments({ tripId: trip._id }) >= 20 && !await Invitation.exists({ tripId: trip._id, email })) fail("Tối đa 20 lời mời đang chờ. Hãy thu hồi lời mời cũ.");
  const token = crypto.randomBytes(32).toString("base64url");
  const invitation = await Invitation.findOneAndUpdate({ tripId: trip._id, email }, { role: selectedRole,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 7 * 86400000) }, { upsert: true, returnDocument: "after", runValidators: true });
  res.status(201).json({ path: `/join/${token}`, invitation: { _id: invitation._id, email, role: selectedRole, expiresAt: invitation.expiresAt } });
});
router.delete("/:id/invitations/:invitationId", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  await Invitation.deleteOne({ _id: objectId(req.params.invitationId), tripId: trip._id });
  res.json({ message: "Đã thu hồi lời mời." });
});
router.patch("/:id/team/:memberId", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  const memberId = objectId(req.params.memberId), selectedRole = role(req.body.role);
  const updated = await Itinerary.findOneAndUpdate({ _id: trip._id, "collaborators.userId": memberId },
    { $set: { "collaborators.$.role": selectedRole }, $inc: { __v: 1 } }, { returnDocument: "after" });
  if (!updated) fail("Không tìm thấy cộng tác viên.", 404);
  await record(req.user, "itinerary.updated", trip, "Thay đổi quyền cộng tác viên");
  res.json({ message: "Đã cập nhật quyền." });
});
router.delete("/:id/team/:memberId", async (req, res) => {
  const trip = await accessible(req);
  const memberId = req.params.memberId === "self" ? String(req.user._id) : objectId(req.params.memberId);
  if (String(trip.userId) === memberId) fail("Chủ chuyến đi không thể rời nhóm.");
  if (roleFor(trip, req.user._id) !== "owner" && memberId !== String(req.user._id)) fail("Chỉ chủ chuyến đi được thu hồi quyền người khác.", 403);
  await Itinerary.updateOne({ _id: trip._id }, { $pull: { collaborators: { userId: memberId } }, $inc: { __v: 1 } });
  await record(req.user, "itinerary.updated", trip, "Thu hồi quyền / rời chuyến đi");
  res.json({ message: "Đã cập nhật thành viên." });
});
router.get("/:id/comments", async (req, res) => {
  const trip = await accessible(req);
  const filter = { tripId: trip._id, ...(req.query.before ? { _id: { $lt: objectId(req.query.before) } } : {}) };
  const rows = await Comment.find(filter).sort({ _id: -1 }).limit(51).lean();
  res.json({ items: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49]._id : null });
});
router.post("/:id/comments", require("express-rate-limit").rateLimit({ windowMs: 3600000, limit: 60, keyGenerator: req => String(req.user._id), standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Tối đa 60 trao đổi mỗi giờ. Vui lòng thử lại sau." } }), async (req, res) => {
  const trip = await accessible(req, { write: true });
  const content = text(req.body.text, "Bình luận", 1000);
  if (!["comment", "suggestion"].includes(req.body.kind)) fail("Loại trao đổi không hợp lệ.");
  const comment = await Comment.create({ tripId: trip._id, userId: req.user._id, authorName: req.user.fullName, text: content, kind: req.body.kind });
  res.status(201).json({ comment });
});
router.delete("/:id/comments/:commentId", async (req, res) => {
  const trip = await accessible(req, { write: true });
  const filter = { _id: objectId(req.params.commentId), tripId: trip._id, ...(roleFor(trip, req.user._id) !== "owner" ? { userId: req.user._id } : {}) };
  if (!await Comment.findOneAndDelete(filter)) fail("Không tìm thấy bình luận hoặc không có quyền xóa.", 404);
  res.json({ message: "Đã xóa bình luận." });
});
module.exports = router;
