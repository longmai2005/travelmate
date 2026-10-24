const router = require("express").Router();
const Feedback = require("../models/Feedback");
const { objectId, text, integer, fail } = require("../utils/validation");
const statuses = ["open", "in_review", "resolved", "dismissed"];
router.get("/feedback", async (req, res) => {
  const { page, limit, skip, } = require("../utils/adminData").pagination(req.query);
  const filter = {};
  if (req.query.status) { if (!statuses.includes(req.query.status)) fail("Trạng thái phản hồi không hợp lệ."); filter.status = req.query.status; }
  if (req.query.type) {
    if (!Feedback.schema.path("type").enumValues.includes(req.query.type)) fail("Loại phản hồi không hợp lệ.");
    filter.type = req.query.type;
  }
  if (req.query.scope) {
    if (!["destination", "general"].includes(req.query.scope)) fail("Phạm vi phản hồi không hợp lệ.");
    filter.destinationId = req.query.scope === "destination" ? { $ne: null } : null;
  }
  if (req.query.destinationId) filter.$and = [{ destinationId: objectId(req.query.destinationId) }];
  const [items, total] = await Promise.all([Feedback.find(filter).populate("userId", "fullName email").populate("destinationId", "name province isActive").sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(), Feedback.countDocuments(filter)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});
router.patch("/feedback/:id", async (req, res) => {
  if (!statuses.includes(req.body.status)) fail("Trạng thái phản hồi không hợp lệ.");
  const reply = text(req.body.reply, "Phản hồi gửi thành viên", 1000);
  const version = integer(req.body.version, "Phiên bản phản hồi", 0, 1e9);
  const feedback = await Feedback.findOneAndUpdate({ _id: objectId(req.params.id), __v: version, "history.49": { $exists: false } },
    { $set: { status: req.body.status }, $push: { history: { status: req.body.status, reply, adminName: req.user.fullName, createdAt: new Date() } }, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true });
  if (!feedback) fail("Phản hồi đã thay đổi, không tồn tại hoặc đạt giới hạn 50 cập nhật. Hãy tải lại.", 409);
  await require("../utils/activity")(req.user, "feedback.updated", { _id: feedback._id, title: feedback.subject }, req.body.status);
  res.json({ feedback });
});
module.exports = router;
