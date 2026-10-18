const test = require("node:test");
const assert = require("node:assert/strict");
const { budget, validateExpenses } = require("../utils/validation");
const { validateSuggestion, suggest } = require("../utils/suggestions");
const input = require("../utils/destinationInput");
test("Ngân sách cộng khoản chi cả chuyến và mỗi người, không nhân đôi tiền khách sạn", () => {
  const result = budget({ travelers: 3, budgetLimitVnd: 2000000,
    days: [{ items: [{ destinationId: { estimatedCostPerPersonVnd: 100000 } }] }],
    expenses: [{ category: "accommodation", amountVnd: 900000, scope: "trip" },
      { category: "food", amountVnd: 200000, scope: "person" }, { category: "transport", amountVnd: 0, scope: "trip" }] });
  assert.equal(result.total, 1800000);
  assert.equal(result.remaining, 200000);
  assert.equal(result.breakdown.accommodation, 900000);
  assert.equal(result.breakdown.food, 600000);
  assert.equal(result.percent, 90);
});
test("Khoản chi từ chối số lẻ, quá nhiều dòng, loại và phạm vi không hợp lệ", () => {
  const expense = { label: "Ăn uống", category: "food", amountVnd: 100000, scope: "person" };
  assert.deepEqual(validateExpenses([expense]), [expense]);
  for (const patch of [{ amountVnd: -1 }, { amountVnd: 1.5 }, { scope: "day" }, { category: "bad" }, { label: "" }])
    assert.throws(() => validateExpenses([{ ...expense, ...patch }]));
  assert.throws(() => validateExpenses(Array(101).fill(expense)));
});
test("Gợi ý giữ trong tỉnh, không trùng điểm và không vượt phần ngân sách đã biết", () => {
  const settings = validateSuggestion({ province: "Đà Nẵng", categories: ["nature"], startDate: "2026-12-01", endDate: "2026-12-02", travelers: 2,
    budgetLimitVnd: 500000, expenses: [{ label: "Xe", category: "transport", amountVnd: 100000, scope: "trip" }] });
  const destinations = [
    { _id: "a", name: "A", province: "Đà Nẵng", category: "nature", recommendedDurationHours: 2, estimatedCostPerPersonVnd: 200000, isActive: true },
    { _id: "b", name: "B", province: "Đà Nẵng", category: "nature", recommendedDurationHours: 2, estimatedCostPerPersonVnd: 10000, isActive: true },
    { _id: "c", name: "C", province: "Đà Nẵng", category: "nature", recommendedDurationHours: 2, estimatedCostPerPersonVnd: null, isActive: true },
    { _id: "d", name: "D", province: "Hà Nội", category: "nature", recommendedDurationHours: 2, estimatedCostPerPersonVnd: 0, isActive: true },
    { _id: "e", name: "E", province: "Đà Nẵng", category: "nature", recommendedDurationHours: 2, estimatedCostPerPersonVnd: 0, isActive: false },
  ];
  const result = suggest(settings, destinations);
  const items = result.days.flatMap((d) => d.items);
  assert.deepEqual(items.map((i) => i.destinationId._id), ["a", "c"]);
  assert.equal(new Set(items.map((i) => i.destinationId._id)).size, items.length);
  assert.equal(result.budget.total, 500000);
  assert.equal(result.budget.missing, 1);
  assert.ok(result.warnings.some((w) => w.includes("chưa có giá")));
});
test("Gợi ý không tự coi ngân sách bằng 0 là không giới hạn", () => {
  const settings = validateSuggestion({ province: "A", categories: [], startDate: "2026-12-01", endDate: "2026-12-01", travelers: 1, budgetLimitVnd: 0 });
  const result = suggest(settings, [{ _id: "a", name: "A", province: "A", category: "nature", estimatedCostPerPersonVnd: 1, recommendedDurationHours: 2 }]);
  assert.equal(result.days[0].items.length, 0);
  assert.throws(() => validateSuggestion({ ...settings, startDate: "2026-12-01", endDate: "2026-12-01", categories: ["bad"] }));
});
test("Nguồn điểm đến chỉ nhận HTTP(S), ngày thực và ngày đã kiểm tra", () => {
  const destination = require("../data/destinations")[0];
  const fields = { ...destination, sourceUrl: "https://example.com/info", verifiedOn: "2026-01-01", address: "Địa chỉ", openingHours: "08:00–17:00" };
  assert.equal(input(fields).verifiedOn, "2026-01-01");
  for (const patch of [{ sourceUrl: "javascript:alert(1)" }, { verifiedOn: "2026-02-30" }, { verifiedOn: "2099-01-01" }, { sourceUrl: "" }])
    assert.throws(() => input({ ...fields, ...patch }));
});
