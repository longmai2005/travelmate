const Destination = require("../models/Destination");
const User = require("../models/User");
const Itinerary = require("../models/Itinerary");
const Favorite = require("../models/Favorite");
const {
  todayInVietnam,
  userFields,
  safeUser,
  populateTrip,
  serializeTrip,
} = require("./adminData");
module.exports = async function overview(req, res) {
  const today = todayInVietnam();
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(today) + (i - 6) * 86400000).toISOString().slice(0, 10),
  );
  const since = new Date(`${days[0]}T00:00:00+07:00`);
  const daily = (Model) =>
    Model.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);
  const [
    total,
    active,
    users,
    itineraries,
    lockedUsers,
    admins,
    favorites,
    upcoming,
    ongoing,
    completed,
    recentUsers,
    recentTrips,
    userDaily,
    tripDaily,
    popular,
  ] = await Promise.all([
    Destination.countDocuments(),
    Destination.countDocuments({ isActive: true }),
    User.countDocuments(),
    Itinerary.countDocuments(),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ role: "admin" }),
    Favorite.countDocuments(),
    Itinerary.countDocuments({ startDate: { $gt: today } }),
    Itinerary.countDocuments({
      startDate: { $lte: today },
      endDate: { $gte: today },
    }),
    Itinerary.countDocuments({ endDate: { $lt: today } }),
    User.find()
      .select(userFields)
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .lean(),
    populateTrip(Itinerary.find().sort({ createdAt: -1, _id: -1 }).limit(5)),
    daily(User),
    daily(Itinerary),
    Itinerary.aggregate([
      { $unwind: "$days" },
      { $unwind: "$days.items" },
      { $group: { _id: "$days.items.destinationId", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "destinations",
          localField: "_id",
          foreignField: "_id",
          as: "destination",
        },
      },
      {
        $project: {
          count: 1,
          name: {
            $ifNull: [
              { $arrayElemAt: ["$destination.name", 0] },
              "Điểm đến không còn tồn tại",
            ],
          },
          province: { $arrayElemAt: ["$destination.province", 0] },
        },
      },
    ]),
  ]);
  const dailyMap = (rows) => new Map(rows.map((d) => [d._id, d.count]));
  const um = dailyMap(userDaily),
    tm = dailyMap(tripDaily);
  res.json({
    total,
    active,
    inactive: total - active,
    users,
    itineraries,
    lockedUsers,
    activeUsers: users - lockedUsers,
    admins,
    favorites,
    upcoming,
    ongoing,
    completed,
    today,
    recentUsers: recentUsers.map(safeUser),
    recentItineraries: recentTrips.map((trip) =>
      serializeTrip(trip, false, today),
    ),
    popularDestinations: popular,
    activity: days.map((date) => ({
      date,
      users: um.get(date) || 0,
      itineraries: tm.get(date) || 0,
    })),
  });
};
