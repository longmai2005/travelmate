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
router.get("/destinations", (req, res) => listing(req, res, true));
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
    input(body),
    { returnDocument: "after", runValidators: true },
  );
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  await recordActivity(req.user, "destination.updated", destination);
  res.json({ destination });
});
async function status(req, res, active) {
  const destination = await Destination.findByIdAndUpdate(
    objectId(req.params.id),
    { isActive: active },
    { returnDocument: "after" },
  );
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  await recordActivity(req.user, active ? "destination.restored" : "destination.hidden", destination);
  res.json({ destination });
}
router.delete("/destinations/:id", (req, res) => status(req, res, false));
router.patch("/destinations/:id/restore", (req, res) => status(req, res, true));
module.exports = router;
