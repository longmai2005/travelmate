const { fail } = require("./validation");
const categories = require("../models/Destination").categories;
function preferences(body = {}) {
  if (!Array.isArray(body.categories) || body.categories.length > 7 || body.categories.some(c => !categories.includes(c))) fail("Sở thích không hợp lệ.");
  if (!["relaxed", "balanced", "active"].includes(body.pace) || !["solo", "couple", "family", "friends"].includes(body.companions)) fail("Nhịp độ hoặc nhóm đồng hành không hợp lệ.");
  return { categories: [...new Set(body.categories)], pace: body.pace, companions: body.companions };
}
function recommend(destinations, prefs, favorites) {
  const saved = new Set(favorites.map(d => String(d._id)));
  const savedCategories = new Set(favorites.map(d => d.category));
  return destinations.filter(d => !saved.has(String(d._id))).map(d => {
    const reasons = [], matches = (prefs.categories || []).includes(d.category);
    let score = d.isFeatured ? 1 : 0;
    if (matches) { score += 8; reasons.push("Thuộc trải nghiệm bạn quan tâm"); }
    if (savedCategories.has(d.category)) { score += 4; reasons.push("Cùng nhóm trải nghiệm với nơi bạn đã lưu"); }
    if (prefs.pace === "relaxed" && d.recommendedDurationHours <= 3) { score += 3; reasons.push("Thời lượng tham khảo ngắn, thuận tiện sắp xếp ngày thong thả"); }
    if (prefs.pace === "active" && d.recommendedDurationHours >= 4) { score += 2; reasons.push("Có thể dành nhiều thời gian khám phá"); }
    return { ...d, reasons: reasons.length ? reasons : ["Thêm một lựa chọn từ danh mục TravelMate"], score };
  }).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name,"vi")).slice(0,6).map(({score,...d}) => d);
}
module.exports = { preferences, recommend };
