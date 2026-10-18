const router = require("express").Router();
const Destination = require("../models/Destination");
const input = require("../utils/destinationInput");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const { objectId, fail } = require("../utils/validation");
const { listing } = require("./destinationRoutes");
router.use(requireAuth, requireAdmin);
router.get("/stats", require("../utils/adminOverview"));
router.use(require("./adminPeopleRoutes"));
router.get("/destinations", (req, res) => listing(req, res, true));
router.post("/destinations", async (req, res) =>
  res
    .status(201)
    .json({ destination: await Destination.create(input(req.body)) }),
);
router.put("/destinations/:id", async (req, res) => {
  const destination = await Destination.findByIdAndUpdate(
    objectId(req.params.id),
    input(req.body),
    { returnDocument: "after", runValidators: true },
  );
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  res.json({ destination });
});
async function status(req, res, active) {
  const destination = await Destination.findByIdAndUpdate(
    objectId(req.params.id),
    { isActive: active },
    { returnDocument: "after" },
  );
  if (!destination) fail("Không tìm thấy địa điểm.", 404);
  res.json({ destination });
}
router.delete("/destinations/:id", (req, res) => status(req, res, false));
router.patch("/destinations/:id/restore", (req, res) => status(req, res, true));
module.exports = router;
