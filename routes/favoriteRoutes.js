const router = require("express").Router();
const Favorite = require("../models/Favorite");
const Destination = require("../models/Destination");
const { requireAuth } = require("../middleware/authMiddleware");
const { objectId, fail } = require("../utils/validation");
router.use(requireAuth);
router.get("/", async (req, res) => {
  const favorites = await Favorite.find({ userId: req.user._id })
    .populate("destinationId")
    .sort({ createdAt: -1 });
  res.json({
    items: favorites.filter((f) => f.destinationId).map((f) => f.destinationId),
  });
});
router.post("/", async (req, res) => {
  const destinationId = objectId(req.body.destinationId);
  if (!(await Destination.exists({ _id: destinationId, isActive: true })))
    fail("Địa điểm không còn hoạt động.", 404);
  await Favorite.updateOne(
    { userId: req.user._id, destinationId },
    { $setOnInsert: { userId: req.user._id, destinationId } },
    { upsert: true },
  );
  res.status(201).json({ message: "Đã lưu địa điểm yêu thích." });
});
router.delete("/:destinationId", async (req, res) => {
  await Favorite.deleteOne({
    userId: req.user._id,
    destinationId: objectId(req.params.destinationId),
  });
  res.json({ message: "Đã bỏ lưu địa điểm." });
});
module.exports = router;
