const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const crypto = require("node:crypto");
const Itinerary = require("../models/Itinerary");
const User = require("../models/User");
const { budget, fail } = require("../utils/validation");
router.use(rateLimit({ windowMs: 60000, limit: 90, standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Vui lòng thử lại sau một phút." } }));
router.get("/:token", async (req, res) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) fail("Liên kết không tồn tại hoặc đã được thu hồi.", 404);
  const hash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const trip = await Itinerary.findOne({ shareTokenHash: hash }).populate("days.items.destinationId",
    "name province address imageUrl estimatedCostPerPersonVnd isActive latitude longitude");
  if (!trip || !await User.exists({ _id: trip.userId, isActive: { $ne: false } }))
    fail("Liên kết không tồn tại hoặc đã được thu hồi.", 404);
  // Explicit public fields: never expose the owner's identity or sharing credentials.
  res.json({ itinerary: { title: trip.title, startDate: trip.startDate, endDate: trip.endDate,
    travelers: trip.travelers, budgetLimitVnd: trip.budgetLimitVnd, notes: trip.notes,
    expenses: trip.expenses, days: trip.days, budget: budget(trip), updatedAt: trip.updatedAt } });
});
module.exports = router;
