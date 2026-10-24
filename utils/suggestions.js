const { dates, budget, validateExpenses, integer, text, fail } = require("./validation");
const categories = require("../models/Destination").categories;
function validateSuggestion(body) {
  const dayDates = dates(body.startDate, body.endDate);
  const province = text(body.province, "Tỉnh / thành phố", 100);
  if (!Array.isArray(body.categories) || body.categories.length > 7 || body.categories.some((c) => !categories.includes(c)))
    fail("Sở thích không hợp lệ.");
  const pace = body.pace || "balanced", companions = body.companions || "friends";
  if (!["relaxed", "balanced", "active"].includes(pace) || !["solo", "couple", "family", "friends"].includes(companions)) fail("Nhịp độ hoặc nhóm đồng hành không hợp lệ.");
  return { dayDates, province, pace, companions, categories: [...new Set(body.categories)],
    variant: integer(body.variant ?? 0, "Phương án", 0, 1000000),
    travelers: integer(body.travelers, "Số người", 1, 100),
    budgetLimitVnd: integer(body.budgetLimitVnd, "Ngân sách"), expenses: validateExpenses(body.expenses ?? []) };
}
function suggest(input, destinations) {
  const { dayDates, travelers, budgetLimitVnd, expenses } = input;
  let remaining = Math.max(0, budgetLimitVnd - budget({ travelers, budgetLimitVnd, expenses, days: [] }).total);
  const used = new Set();
  const candidates = destinations.filter((d) => d.isActive !== false && d.province === input.province)
    .sort((a, b) => {
      const score = (d) => (input.categories.includes(d.category) ? 10 : 0) + (input.variant ? 0 : (d.estimatedCostPerPersonVnd != null ? 3 : 0) + (d.isFeatured ? 1 : 0));
      const rank = d => { let n = 2166136261; for (const c of `${input.variant}:${d._id}`) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
      return score(b) - score(a) || (input.variant ? rank(a) - rank(b) : 0) || a.name.localeCompare(b.name, "vi") || String(a._id).localeCompare(String(b._id));
    });
  const days = dayDates.map((date) => {
    let minutes = 9 * 60, hours = 0;
    const maxHours = input.pace === "relaxed" ? 5 : input.pace === "active" ? 10 : 8;
    const maxItems = input.pace === "relaxed" || input.companions === "family" ? 2 : 3;
    const items = [];
    for (const d of candidates) {
      const duration = d.recommendedDurationHours || 2;
      const cost = (d.estimatedCostPerPersonVnd ?? 0) * travelers;
      if (used.has(String(d._id)) || duration > 8 || hours + duration > maxHours || cost > remaining || items.length >= maxItems) continue;
      used.add(String(d._id));
      remaining -= cost;
      items.push({ destinationId: d, visitTime: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
        note: input.categories.includes(d.category) ? "Gợi ý vì thuộc trải nghiệm bạn ưu tiên." : "Lựa chọn thêm theo thời lượng và phần ngân sách còn lại.", customCostPerPersonVnd: null, order: items.length });
      minutes += Math.ceil((duration + 0.5) * 60);
      hours += duration + 0.5;
    }
    return { date, notes: "", items };
  });
  const resultBudget = budget({ travelers, budgetLimitVnd, expenses, days });
  const warnings = ["Gợi ý theo sở thích, giá tham khảo và thời lượng tại một tỉnh/thành. Chưa tối ưu tuyến đường, thời gian di chuyển hoặc giờ mở cửa; hãy kiểm tra trước khi đi."];
  if (resultBudget.missing) warnings.push(`${resultBudget.missing} hoạt động chưa có giá; cần bổ sung chi phí trước khi xác nhận ngân sách.`);
  if (days.some((d) => !d.items.length)) warnings.push("Một số ngày còn trống do thiếu điểm đến phù hợp, thời lượng hoặc ngân sách. Bạn có thể thêm thủ công.");
  if (resultBudget.remaining < 0) warnings.push("Các khoản chi bổ sung đã vượt ngân sách.");
  const alternatives = candidates.filter(d => !used.has(String(d._id)));
  return { days, budget: resultBudget, warnings, availableCount: candidates.length, alternativesCount: alternatives.length, alternatives: alternatives.slice(0, 12) };
}
module.exports = { validateSuggestion, suggest };
