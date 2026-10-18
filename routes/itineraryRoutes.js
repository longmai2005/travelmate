const router = require("express").Router();
const Itinerary = require("../models/Itinerary");
const Destination = require("../models/Destination");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  validateItinerary,
  objectId,
  fail,
  budget,
} = require("../utils/validation");
router.use(requireAuth);
const populated = (query) => query.populate("days.items.destinationId");
const serialize = (trip) => ({ ...trip.toObject(), budget: budget(trip) });
async function owned(req) {
  const trip = await populated(
    Itinerary.findOne({ _id: objectId(req.params.id), userId: req.user._id }),
  );
  if (!trip) fail("Không tìm thấy lịch trình của bạn.", 404);
  return trip;
}
async function validDestinations(data, oldTrip) {
  const ids = [
    ...new Set(data.days.flatMap((d) => d.items.map((i) => i.destinationId))),
  ];
  const destinations = await Destination.find({ _id: { $in: ids } });
  const oldIds = new Set(
    oldTrip?.days.flatMap((d) =>
      d.items.map((i) => i.destinationId?._id.toString()),
    ) || [],
  );
  if (
    destinations.length !== ids.length ||
    destinations.some((d) => !d.isActive && !oldIds.has(d._id.toString()))
  )
    fail("Có địa điểm không tồn tại hoặc đã ngừng hoạt động.");
}
router.get("/", async (req, res) => {
  const trips = await populated(
    Itinerary.find({ userId: req.user._id }).sort({ updatedAt: -1 }),
  );
  res.json({ items: trips.map(serialize) });
});
router.post("/", async (req, res) => {
  const data = validateItinerary(req.body);
  await validDestinations(data);
  const trip = await Itinerary.create({ ...data, userId: req.user._id });
  await trip.populate("days.items.destinationId");
  res.status(201).json({ itinerary: serialize(trip) });
});
router.get("/:id", async (req, res) =>
  res.json({ itinerary: serialize(await owned(req)) }),
);
router.put("/:id", async (req, res) => {
  const trip = await owned(req);
  const data = validateItinerary(req.body);
  const removedWithItems = trip.days.some(
    (day) => day.items.length && !data.days.some((d) => d.date === day.date),
  );
  if (removedWithItems && req.body.confirmDateRemoval !== true)
    fail("Đổi ngày sẽ xóa hoạt động. Hãy xác nhận trước khi lưu.", 409);
  await validDestinations(data, trip);
  Object.assign(trip, data);
  await trip.save();
  await trip.populate("days.items.destinationId");
  res.json({ itinerary: serialize(trip) });
});
router.delete("/:id", async (req, res) => {
  const trip = await owned(req);
  await trip.deleteOne();
  res.json({ message: "Đã xóa lịch trình." });
});
module.exports = router;
