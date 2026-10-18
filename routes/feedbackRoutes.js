const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const { requireAuth } = require("../middleware/authMiddleware");
const Feedback = require("../models/Feedback");
const Destination = require("../models/Destination");
const { text, objectId, fail } = require("../utils/validation");
router.use(requireAuth);
router.get("/", async (req, res) => {
  const { page, limit, skip } = require("../utils/adminData").pagination(req.query);
  const filter = { userId: req.user._id };
  const [items, total] = await Promise.all([Feedback.find(filter).populate("destinationId", "name province").sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(), Feedback.countDocuments(filter)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});
router.post("/", rateLimit({ windowMs: 3600000, limit: 10, keyGenerator: req => String(req.user._id), standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Bạn đã gửi nhiều phản hồi. Vui lòng thử lại sau một giờ." } }), async (req, res) => {
  if (!["price", "address", "closed", "other"].includes(req.body.type)) fail("Loại phản hồi không hợp lệ.");
  const destinationId = req.body.destinationId ? objectId(req.body.destinationId) : null;
  if (destinationId && !await Destination.exists({ _id: destinationId, isActive: true })) fail("Không tìm thấy điểm đến đang hiển thị.", 404);
  const feedback = await Feedback.create({ userId: req.user._id, destinationId, type: req.body.type,
    subject: text(req.body.subject, "Tiêu đề", 150), content: text(req.body.content, "Nội dung phản hồi", 2000) });
  await require("../utils/activity")(req.user, "feedback.created", { _id: feedback._id, title: feedback.subject });
  res.status(201).json({ feedback });
});
module.exports = router;
