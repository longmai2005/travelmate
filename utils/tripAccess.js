const Itinerary = require("../models/Itinerary");
const { objectId, fail, integer } = require("./validation");
function roleFor(trip, userId) {
  if (String(trip.userId?._id || trip.userId) === String(userId)) return "owner";
  return trip.collaborators?.find(member => String(member.userId?._id || member.userId) === String(userId))?.role || null;
}
function accessFilter(userId) { return { $or: [{ userId }, { "collaborators.userId": userId }] }; }
async function accessible(req, { write = false, owner = false, history = false } = {}) {
  const query = Itinerary.findOne({ _id: objectId(req.params.id), ...accessFilter(req.user._id) });
  if (history) query.select("+planHistory");
  const trip = await query.populate("days.items.destinationId");
  if (!trip) fail("Không tìm thấy lịch trình hoặc bạn chưa được cấp quyền.", 404);
  const role = roleFor(trip, req.user._id);
  if ((owner && role !== "owner") || (write && role === "viewer")) fail("Bạn không có quyền thực hiện thao tác này.", 403);
  return trip;
}
function checkRevision(trip, body) {
  if (trip.collaborators.length && body.version == null) fail("Cần tải phiên bản lịch trình mới nhất trước khi lưu.", 409);
  if (body.version != null && integer(body.version, "Phiên bản", 0, 1e9) !== trip.__v)
    fail("Lịch trình đã được người khác cập nhật. Hãy tải bản mới, đối chiếu thay đổi rồi lưu lại.", 409);
}
module.exports = { accessible, roleFor, accessFilter, checkRevision };
