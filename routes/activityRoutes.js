const router = require("express").Router();
const Activity = require("../models/Activity");
const { objectId, fail } = require("../utils/validation");
const { pagination } = require("../utils/adminData");
router.get("/activity", async (req, res) => {
  const filter = {};
  if (req.query.group) {
    if (!["user", "itinerary", "destination"].includes(req.query.group)) fail("Nhóm hoạt động không hợp lệ.");
    filter.action = new RegExp(`^${req.query.group}\\.`);
  }
  const after = req.query.after ? objectId(req.query.after) : null;
  // Bound a poll to one cursor so concurrent writes cannot be skipped.
  const latest = await Activity.findOne().sort({ _id: -1 }).select("_id").lean();
  if (latest) filter._id = { $lte: latest._id, ...(after ? { $gt: after } : {}) };
  else if (after) filter._id = { $gt: after };
  const { page, limit, skip } = pagination(req.query);
  const [items, total] = await Promise.all([
    Activity.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
    Activity.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), latestCursor: latest?._id || null });
});
module.exports = router;
