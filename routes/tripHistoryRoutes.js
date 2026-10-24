const router = require("express").Router();
const Draft = require("../models/TripDraft");
const { accessible, checkRevision } = require("../utils/tripAccess");
const { integer, fail, validateItinerary } = require("../utils/validation");
const groupInput = require("../utils/groupInput");
const { rememberPlan, validDestinations } = require("../utils/tripPlan");
router.get("/:id/draft", async (req, res) => {
  await accessible(req, { write: true });
  const draft = await Draft.findOne({ tripId: req.params.id, userId: req.user._id, expiresAt: { $gt: new Date() } }).lean();
  if (draft) {
    const destinations = await require("../models/Destination").find({ _id: { $in: draft.body.days.flatMap(d => d.items.map(i => i.destinationId)) } }).lean();
    draft.body.days.forEach(d => d.items.forEach(i => i.destinationId = destinations.find(p => String(p._id) === i.destinationId) || null));
  }
  res.json({ draft });
});
router.put("/:id/draft", async (req, res) => {
  const trip = await accessible(req, { write: true });
  const baseVersion = integer(req.body.baseVersion, "Phiên bản gốc", 0, 1e9);
  if (baseVersion !== trip.__v) fail("Bản lưu đã đổi. Tải và đối chiếu bản mới trước khi cập nhật bản nháp.", 409);
  if (!req.body.body || typeof req.body.body !== "object" || Array.isArray(req.body.body)) fail("Nội dung bản nháp không hợp lệ.");
  const body = { ...validateItinerary(req.body.body), ...groupInput(req.body.body, req.body.body.travelers) };
  if (req.body.body.confirmDateRemoval === true) body.confirmDateRemoval = true;
  await validDestinations(body, trip);
  const values = { baseVersion, body, expiresAt: new Date(Date.now() + 7 * 86400000) };
  let draft;
  if (req.body.revision == null) {
    await Draft.deleteOne({ tripId: trip._id, userId: req.user._id, expiresAt: { $lte: new Date() } });
    try { draft = await Draft.create({ ...values, tripId: trip._id, userId: req.user._id }); }
    catch (error) { if (error.code === 11000) fail("Bản nháp đã đổi ở tab khác. Mở lại lịch trình để đối chiếu.", 409); throw error; }
  } else {
    draft = await Draft.findOneAndUpdate({ tripId: trip._id, userId: req.user._id, __v: integer(req.body.revision, "Phiên bản nháp", 0, 1e9) }, { $set: values, $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true });
    if (!draft) fail("Bản nháp đã đổi ở tab khác. Mở lại lịch trình để đối chiếu.", 409);
  }
  res.json({ revision: draft.__v, updatedAt: draft.updatedAt });
});
router.delete("/:id/draft", async (req, res) => {
  await accessible(req, { write: true });
  const result = await Draft.deleteOne({ tripId: req.params.id, userId: req.user._id, __v: integer(req.body.revision, "Phiên bản nháp", 0, 1e9) });
  if (!result.deletedCount) fail("Bản nháp đã thay đổi. Mở lại lịch trình để đối chiếu.", 409);
  res.json({ message: "Đã bỏ bản nháp riêng." });
});
router.get("/:id/history", async (req, res) => {
  const trip = await accessible(req, { history: true });
  res.json({ version: trip.__v, items: [...(trip.planHistory || [])].reverse().map(h => ({ version: h.version, savedAt: h.savedAt, authorName: h.authorName, title: h.plan.title, startDate: h.plan.startDate, endDate: h.plan.endDate, activities: h.plan.days.reduce((n,d) => n + d.items.length, 0) })) });
});
router.get("/:id/history/:version", async (req, res) => {
  const trip = await accessible(req, { history: true });
  const entry = trip.planHistory.find(h => h.version === integer(Number(req.params.version), "Phiên bản", 0, 1e9));
  if (!entry) fail("Không tìm thấy phiên bản kế hoạch.", 404);
  const plan = structuredClone(entry.plan);
  const destinations = await require("../models/Destination").find({ _id: { $in: plan.days.flatMap(d => d.items.map(i => i.destinationId)) } }).lean();
  plan.days.forEach(d => d.items.forEach(i => i.destinationId = destinations.find(p => String(p._id) === i.destinationId) || null));
  res.json({ plan, version: entry.version });
});
router.post("/:id/history/:version/restore", async (req, res) => {
  const trip = await accessible(req, { write: true, history: true });
  if (req.body.version == null) fail("Cần phiên bản hiện tại trước khi khôi phục.", 409);
  checkRevision(trip, req.body);
  const entry = trip.planHistory.find(h => h.version === integer(Number(req.params.version), "Phiên bản", 0, 1e9));
  if (!entry) fail("Không tìm thấy phiên bản kế hoạch.", 404);
  if (req.body.confirm !== true) fail("Cần xác nhận thay thế kế hoạch hiện tại.", 400);
  const data = validateItinerary(entry.plan);
  groupInput({ participants: trip.participants, actualExpenses: trip.actualExpenses, settlements: trip.settlements }, data.travelers);
  await validDestinations(data, trip);
  rememberPlan(trip, req.user.fullName);
  Object.assign(trip, data);
  await trip.save();
  await require("../utils/activity")(req.user, "itinerary.restored", trip, `Từ phiên bản ${entry.version}`);
  res.json({ message: "Đã khôi phục kế hoạch; quyền cộng tác, chia sẻ và sổ chi thực tế được giữ." });
});
module.exports = router;
