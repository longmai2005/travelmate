const router = require("express").Router();
const Destination = require("../models/Destination");
const input = require("../utils/destinationInput");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const { objectId, fail } = require("../utils/validation");
const { listing } = require("./destinationRoutes");
const recordActivity = require("../utils/activity");
router.use(requireAuth, requireAdmin);
router.get("/stats", require("../utils/adminOverview"));
router.use(require("./adminPeopleRoutes"));
router.use(require("./activityRoutes"));
router.use(require("./adminFeedbackRoutes"));
router.use(require("./adminReviewRoutes"));
router.use(require("./editorialRoutes"));
router.get("/destinations", (req, res) => listing(req, res, true));
router.get("/destinations/:id", async (req, res) => {
  const destination = await Destination.findById(objectId(req.params.id)).lean();
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  res.json({ destination });
});
router.post("/destinations", async (req, res) => {
  const destination = await Destination.create(input(req.body));
  await recordActivity(req.user, "destination.created", destination);
  res.status(201).json({ destination });
});
router.put("/destinations/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const current = await Destination.findById(id).lean();
  if (!current) fail("Không tìm thấy địa điểm.", 404);
  const body = { ...req.body };
  if (current.imageUrl === body.imageUrl) {
    for (const key of ["imageCredit", "imageSourceUrl", "imageLicense", "imageLicenseUrl", "imageKind", "imageTakenOn"])
      if (!Object.hasOwn(body, key)) body[key] = current[key];
  }
  const destination = await Destination.findByIdAndUpdate(
    id,
    { $set: { ...input(body), slug: current.slug }, $push: { "editorial.history": { $each: [require("../utils/destinationEditorial").previous(current, req.user.fullName)], $slice: -15 } }, $inc: { contentVersion: 1, "editorial.version": 1, __v: 1 } },
    { returnDocument: "after", runValidators: true },
  );
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  await recordActivity(req.user, "destination.updated", destination);
  res.json({ destination });
});
async function status(req, res, active) {
  const destination = await Destination.findByIdAndUpdate(
    objectId(req.params.id),
    { $set: { isActive: active }, $inc: { contentVersion: 1, "editorial.version": 1, __v: 1 } },
    { returnDocument: "after" },
  );
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  await recordActivity(req.user, active ? "destination.restored" : "destination.hidden", destination);
  res.json({ destination });
}
router.delete("/destinations/:id", (req, res) => status(req, res, false));
router.patch("/destinations/:id/restore", (req, res) => status(req, res, true));
module.exports = router;
