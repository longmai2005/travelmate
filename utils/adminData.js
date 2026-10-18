const { budget, fail } = require("./validation");
const userFields =
  "fullName email role isActive createdAt updatedAt lastLoginAt lockedAt lockReason";
function todayInVietnam(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function tripStatus(trip, today = todayInVietnam()) {
  if (trip.startDate > today) return "upcoming";
  return trip.endDate < today ? "completed" : "ongoing";
}
function pagination(query) {
  const page = Math.max(1, Math.min(10000, parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
}
function searchRegex(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  return new RegExp(
    value
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
}
function dateFilter(value, label) {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    fail(`${label} không hợp lệ.`);
  return value;
}
function safeUser(user) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    lockedAt: user.lockedAt || null,
    lockReason: user.lockReason || "",
  };
}
function populateTrip(query) {
  return query
    .populate("userId", userFields)
    .populate(
      "days.items.destinationId",
      "name province imageUrl estimatedCostPerPersonVnd isActive",
    );
}
function serializeTrip(trip, detail = false, today = todayInVietnam()) {
  const d = trip.toObject ? trip.toObject() : trip;
  const summary = {
    _id: d._id,
    title: d.title,
    startDate: d.startDate,
    endDate: d.endDate,
    travelers: d.travelers,
    budgetLimitVnd: d.budgetLimitVnd,
    budget: budget(d),
    status: tripStatus(d, today),
    owner: d.userId ? safeUser(d.userId) : null,
    daysCount: d.days.length,
    activitiesCount: d.days.reduce((n, day) => n + day.items.length, 0),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  return detail ? { ...summary, notes: d.notes, expenses: d.expenses || [], days: d.days } : summary;
}
module.exports = {
  userFields,
  todayInVietnam,
  tripStatus,
  pagination,
  searchRegex,
  dateFilter,
  safeUser,
  populateTrip,
  serializeTrip,
};
