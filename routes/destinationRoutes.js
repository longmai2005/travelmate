const router = require("express").Router();
const Destination = require("../models/Destination");
const { objectId, fail } = require("../utils/validation");
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function listing(req, res, admin = false) {
  const filter = admin ? {} : { isActive: true };
  const { q, province, category, budget, featured, status } = req.query;
  if (typeof q === "string" && q.trim()) {
    const regex = new RegExp(escape(q.trim().slice(0, 100)), "i");
    filter.$or = ["name", "province", "shortDescription", "tags"].map(
      (field) => ({ [field]: regex }),
    );
  }
  if (typeof province === "string" && province) filter.province = province;
  if (typeof category === "string" && category) filter.category = category;
  if (featured === "true") filter.isFeatured = true;
  if (admin && ["active", "inactive"].includes(status))
    filter.isActive = status === "active";
  if (budget === "low")
    filter.estimatedCostPerPersonVnd = { $ne: null, $lt: 200000 };
  if (budget === "medium")
    filter.estimatedCostPerPersonVnd = { $gte: 200000, $lte: 500000 };
  if (budget === "high") filter.estimatedCostPerPersonVnd = { $gt: 500000 };
  const page = Math.max(1, Math.min(10000, parseInt(req.query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 9));
  const sorts = {
    name: { name: 1, _id: 1 },
    costAsc: { estimatedCostPerPersonVnd: 1, _id: 1 },
    costDesc: { estimatedCostPerPersonVnd: -1, _id: 1 },
    featured: { isFeatured: -1, createdAt: 1, _id: 1 },
  };
  if (admin) sorts.updated = { updatedAt: -1, _id: -1 };
  const [items, total, provinces] = await Promise.all([
    Destination.find(filter)
      .collation({ locale: "vi", strength: 1 })
      .sort(sorts[req.query.sort] || sorts.featured)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Destination.countDocuments(filter),
    Destination.distinct("province", admin ? {} : { isActive: true }),
  ]);
  res.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    provinces: provinces.sort((a, b) => a.localeCompare(b, "vi")),
  });
}
router.get("/", (req, res) => listing(req, res));
router.get("/:id", async (req, res) => {
  const destination = await Destination.findOne({
    _id: objectId(req.params.id),
    isActive: true,
  });
  if (!destination) fail("Không tìm thấy địa điểm đang hoạt động.", 404);
  res.json({ destination });
});
module.exports = router;
module.exports.listing = listing;
