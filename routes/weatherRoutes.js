const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const { accessible } = require("../utils/tripAccess");
router.get("/:id/weather", rateLimit({ windowMs: 5 * 60000, limit: 20, keyGenerator: req => String(req.user._id), standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Bạn đã làm mới dự báo nhiều lần. Hãy thử lại sau vài phút." } }), async (req, res) => {
  const trip = await accessible(req);
  res.json(await require("../utils/weather").weatherForTrip(trip, req.app.locals.weatherFetcher));
});
module.exports = router;
