const router = require("express").Router();
const Itinerary = require("../models/Itinerary");
const Destination = require("../models/Destination");
const crypto = require("node:crypto");
const recordActivity = require("../utils/activity");
const { accessible, roleFor, accessFilter, checkRevision } = require("../utils/tripAccess");
const groupInput = require("../utils/groupInput");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  validateItinerary,
  fail,
  budget,
} = require("../utils/validation");
router.use(requireAuth);
const populated = (query) => query.populate("days.items.destinationId");
const serialize = (trip, userId) => {
  const data = trip.toObject();
  delete data.shareTokenHash;
  return { ...data, budget: budget(trip), version: trip.__v, permissions: { role: roleFor(trip, userId), canEdit: ["owner", "editor"].includes(roleFor(trip, userId)), canManage: roleFor(trip, userId) === "owner" } };
};
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
    Itinerary.find(accessFilter(req.user._id)).sort({ updatedAt: -1 }),
  );
  res.json({ items: trips.map(trip => serialize(trip, req.user._id)) });
});
router.use(require("./collaborationRoutes"));
router.use(require("./weatherRoutes"));
router.post("/suggestions", require("./suggestionHandler"));
router.post("/", async (req, res) => {
  const data = validateItinerary(req.body);
  await validDestinations(data);
  const trip = await Itinerary.create({ ...data, ...groupInput(req.body, data.travelers), userId: req.user._id, ownerName: req.user.fullName });
  await trip.populate("days.items.destinationId");
  await recordActivity(req.user, "itinerary.created", trip);
  res.status(201).json({ itinerary: serialize(trip, req.user._id) });
});
router.get("/:id", async (req, res) =>
  res.json({ itinerary: serialize(await accessible(req), req.user._id) }),
);
router.put("/:id", async (req, res) => {
  const trip = await accessible(req, { write: true });
  checkRevision(trip, req.body);
  const data = validateItinerary({ ...req.body, expenses: req.body.expenses ?? trip.expenses });
  Object.assign(data, groupInput({ participants: req.body.participants ?? trip.participants, actualExpenses: req.body.actualExpenses ?? trip.actualExpenses, settlements: req.body.settlements ?? trip.settlements }, data.travelers));
  const removedWithItems = trip.days.some(
    (day) => (day.items.length || day.notes) && !data.days.some((d) => d.date === day.date),
  );
  if (removedWithItems && req.body.confirmDateRemoval !== true)
    fail("Đổi ngày sẽ xóa hoạt động. Hãy xác nhận trước khi lưu.", 409);
  await validDestinations(data, trip);
  Object.assign(trip, data);
  await trip.save();
  await trip.populate("days.items.destinationId");
  await recordActivity(req.user, "itinerary.updated", trip);
  res.json({ itinerary: serialize(trip, req.user._id) });
});
router.delete("/:id", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  await trip.deleteOne();
  await Promise.all([require("../models/TripInvitation").deleteMany({ tripId: trip._id }), require("../models/TripComment").deleteMany({ tripId: trip._id })]);
  await recordActivity(req.user, "itinerary.deleted", trip);
  res.json({ message: "Đã xóa lịch trình." });
});
router.post("/:id/share", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  const token = crypto.randomBytes(32).toString("base64url");
  trip.shareTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  trip.sharedAt = new Date();
  await trip.save();
  await recordActivity(req.user, "itinerary.shared", trip);
  res.json({ path: `/share/${token}`, sharedAt: trip.sharedAt, version: trip.__v });
});
router.delete("/:id/share", async (req, res) => {
  const trip = await accessible(req, { owner: true });
  const updated = await Itinerary.findOneAndUpdate({ _id: trip._id }, { $unset: { shareTokenHash: 1 }, $set: { sharedAt: null }, $inc: { __v: 1 } }, { returnDocument: "after" });
  if (!updated) fail("Chuyến đi không còn tồn tại.", 404);
  await recordActivity(req.user, "itinerary.unshared", trip);
  res.json({ message: "Đã thu hồi liên kết chia sẻ.", version: updated.__v });
});
module.exports = router;
