const Destination = require("../models/Destination");
const { fail } = require("./validation");
const keys = ["title", "startDate", "endDate", "travelers", "budgetLimitVnd", "notes", "expenses", "days"];
function planSnapshot(trip) {
  const data = trip.toObject ? trip.toObject() : structuredClone(trip);
  const plan = Object.fromEntries(keys.map(k => [k, data[k]]));
  plan.days = plan.days.map(day => ({ ...day, items: day.items.map(item => ({ ...item, destinationId: String(item.destinationId?._id || item.destinationId) })) }));
  return plan;
}
function rememberPlan(trip, authorName) {
  trip.planHistory = [...(trip.planHistory || []), { version: trip.__v, savedAt: trip.lastPlanSavedAt || trip.updatedAt, authorName: trip.lastPlanAuthor || "Chưa ghi nhận người lưu", plan: planSnapshot(trip) }].slice(-15);
  trip.lastPlanAuthor = authorName;
  trip.lastPlanSavedAt = new Date();
}
async function validDestinations(data, oldTrip) {
  const ids = [...new Set(data.days.flatMap(d => d.items.map(i => String(i.destinationId))))];
  const destinations = await Destination.find({ _id: { $in: ids } });
  const oldIds = new Set(oldTrip?.days.flatMap(d => d.items.map(i => String(i.destinationId?._id || i.destinationId))) || []);
  if (destinations.length !== ids.length || destinations.some(d => !d.isActive && !oldIds.has(String(d._id))))
    fail("Có địa điểm không tồn tại hoặc đã ngừng hoạt động.");
}
module.exports = { planSnapshot, rememberPlan, validDestinations };
