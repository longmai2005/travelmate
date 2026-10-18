const router = require("express").Router();
const User = require("../models/User");
const Itinerary = require("../models/Itinerary");
const Favorite = require("../models/Favorite");
const recordActivity = require("../utils/activity");
const { fail, objectId, text } = require("../utils/validation");
const {
  userFields,
  todayInVietnam,
  pagination,
  searchRegex,
  dateFilter,
  safeUser,
  populateTrip,
  serializeTrip,
} = require("../utils/adminData");

// Mounted after requireAuth + requireAdmin in adminRoutes.
router.get("/users", async (req, res) => {
  const filter = {};
  const regex = searchRegex(req.query.q);
  if (regex) filter.$or = [{ fullName: regex }, { email: regex }];
  if (req.query.role && !["user", "admin"].includes(req.query.role))
    fail("Vai trò không hợp lệ.");
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status && !["active", "locked"].includes(req.query.status))
    fail("Trạng thái tài khoản không hợp lệ.");
  if (req.query.status)
    filter.isActive = req.query.status === "locked" ? false : { $ne: false };
  const { page, limit, skip } = pagination(req.query);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select(userFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  const ids = users.map((u) => u._id);
  const grouped = (Model) =>
    Model.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
  const [trips, favorites] = await Promise.all([
    grouped(Itinerary),
    grouped(Favorite),
  ]);
  const counts = (rows) => new Map(rows.map((r) => [String(r._id), r.count]));
  const tripCounts = counts(trips),
    favoriteCounts = counts(favorites);
  res.json({
    items: users.map((u) => ({
      ...safeUser(u),
      itineraryCount: tripCounts.get(String(u._id)) || 0,
      favoriteCount: favoriteCounts.get(String(u._id)) || 0,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});
router.get("/users/:id", async (req, res) => {
  const user = await User.findById(objectId(req.params.id))
    .select(userFields)
    .lean();
  if (!user) fail("Không tìm thấy tài khoản.", 404);
  const [itineraryCount, favoriteCount, recent] = await Promise.all([
    Itinerary.countDocuments({ userId: user._id }),
    Favorite.countDocuments({ userId: user._id }),
    populateTrip(
      Itinerary.find({ userId: user._id })
        .sort({ updatedAt: -1, _id: -1 })
        .limit(5),
    ),
  ]);
  res.json({
    user: { ...safeUser(user), itineraryCount, favoriteCount },
    recentItineraries: recent.map((trip) => serializeTrip(trip)),
  });
});
router.patch("/users/:id/status", async (req, res) => {
  const id = objectId(req.params.id);
  if (typeof req.body.isActive !== "boolean")
    fail("Trạng thái tài khoản phải là true hoặc false.");
  const target = await User.findById(id).select(userFields);
  if (!target) fail("Không tìm thấy tài khoản.", 404);
  if (target.role === "admin" || String(req.user._id) === id)
    fail(
      "Tài khoản quản trị được bảo vệ, không thể khóa hoặc thay đổi tại đây.",
      403,
    );
  const reason = req.body.isActive
    ? ""
    : text(req.body.reason, "Lý do tạm khóa", 500);
  if ((target.isActive !== false) === req.body.isActive)
    return res.json({ user: safeUser(target) });
  const user = await User.findOneAndUpdate(
    { _id: id, role: "user" },
    {
      $set: {
        isActive: req.body.isActive,
        lockedAt: req.body.isActive ? null : new Date(),
        lockReason: reason,
        lockedBy: req.body.isActive ? null : req.user._id,
      },
      $inc: { sessionVersion: 1 },
    },
    { returnDocument: "after", runValidators: true },
  ).select(userFields);
  if (!user) fail("Tài khoản đã thay đổi. Hãy tải lại dữ liệu.", 409);
  await recordActivity(req.user, req.body.isActive ? "user.unlocked" : "user.locked", user, reason);
  res.json({ user: safeUser(user) });
});
router.get("/itineraries", async (req, res) => {
  const filter = {};
  const regex = searchRegex(req.query.q);
  if (regex) {
    const owners = await User.find({
      $or: [{ fullName: regex }, { email: regex }],
    })
      .select("_id")
      .lean();
    filter.$or = [
      { title: regex },
      { userId: { $in: owners.map((u) => u._id) } },
    ];
  }
  if (req.query.userId) filter.userId = objectId(req.query.userId);
  const today = todayInVietnam();
  const statusFilters = {
    upcoming: { startDate: { $gt: today } },
    ongoing: { startDate: { $lte: today }, endDate: { $gte: today } },
    completed: { endDate: { $lt: today } },
  };
  if (req.query.status && !Object.hasOwn(statusFilters, req.query.status))
    fail("Trạng thái lịch trình không hợp lệ.");
  if (req.query.status) Object.assign(filter, statusFilters[req.query.status]);
  const from = dateFilter(req.query.from, "Ngày khởi hành từ"),
    to = dateFilter(req.query.to, "Ngày khởi hành đến");
  if (from && to && from > to) fail("Khoảng ngày khởi hành bị đảo ngược.");
  if (from || to)
    filter.$and = [
      {
        startDate: {
          ...(from ? { $gte: from } : {}),
          ...(to ? { $lte: to } : {}),
        },
      },
    ];
  const sorts = {
    updated: { updatedAt: -1, _id: -1 },
    created: { createdAt: -1, _id: -1 },
    start: { startDate: 1, _id: 1 },
  };
  if (req.query.sort && !Object.hasOwn(sorts, req.query.sort))
    fail("Cách sắp xếp không hợp lệ.");
  const { page, limit, skip } = pagination(req.query);
  const [items, total] = await Promise.all([
    populateTrip(
      Itinerary.find(filter)
        .sort(sorts[req.query.sort] || sorts.updated)
        .skip(skip)
        .limit(limit),
    ),
    Itinerary.countDocuments(filter),
  ]);
  res.json({
    items: items.map((trip) => serializeTrip(trip, false, today)),
    total,
    page,
    pages: Math.ceil(total / limit),
    today,
  });
});
router.get("/itineraries/:id", async (req, res) => {
  const trip = await populateTrip(Itinerary.findById(objectId(req.params.id)));
  if (!trip) fail("Không tìm thấy lịch trình.", 404);
  res.json({ itinerary: serializeTrip(trip, true) });
});
module.exports = router;
