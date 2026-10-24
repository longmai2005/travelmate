const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { preferences, recommend } = require("../utils/preferences");
router.use(requireAuth);
router.get("/preferences", (req,res) => res.json({ preferences: req.user.preferences }));
router.put("/preferences", async (req,res) => {
  req.user.preferences = preferences(req.body);
  await req.user.save();
  await require("../utils/activity")(req.user, "user.preferences_updated", req.user);
  res.json({ preferences: req.user.preferences });
});
router.get("/recommendations", async (req,res) => {
  const Favorite = require("../models/Favorite"), Destination = require("../models/Destination");
  const [destinations,favorites] = await Promise.all([Destination.find({isActive:true}).lean(), Favorite.find({userId:req.user._id}).populate("destinationId","category").lean()]);
  res.json({ items: recommend(destinations,req.user.preferences || {},favorites.map(f=>f.destinationId).filter(Boolean)) });
});
module.exports = router;
