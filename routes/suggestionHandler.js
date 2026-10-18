const Destination = require("../models/Destination");
const { validateSuggestion, suggest } = require("../utils/suggestions");
module.exports = async (req, res) => {
  const input = validateSuggestion(req.body);
  const destinations = await Destination.find({ isActive: true, province: input.province }).sort({ _id: 1 }).lean();
  res.json(suggest(input, destinations));
};
