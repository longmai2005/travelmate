const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dates,
  validateItinerary,
  budget,
  objectId,
} = require("../utils/validation");
const input = require("../utils/destinationInput");
const sample = () => ({
  title: "Đà Nẵng mùa hè",
  startDate: "2026-11-10",
  endDate: "2026-11-12",
  travelers: 2,
  budgetLimitVnd: 3000000,
  notes: "",
  days: ["2026-11-10", "2026-11-11", "2026-11-12"].map((date) => ({
    date,
    items: [],
  })),
});
test("Ngày thuần túy: ba ngày, qua tháng và năm nhuận", () => {
  assert.deepEqual(dates("2026-11-10", "2026-11-12"), [
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
  ]);
  assert.deepEqual(dates("2028-02-28", "2028-03-01"), [
    "2028-02-28",
    "2028-02-29",
    "2028-03-01",
  ]);
});
test("Từ chối ngày sai, đảo ngày và quá bảy ngày", () => {
  for (const pair of [
    ["2026-02-30", "2026-03-01"],
    ["2026-11-12", "2026-11-10"],
    ["2026-11-01", "2026-11-08"],
    ["bad", "bad"],
  ])
    assert.throws(() => dates(...pair));
});
test("Xác thực cấu trúc lịch trình và không nhận trường userId từ client", () => {
  const result = validateItinerary({ ...sample(), userId: "attacker" });
  assert.equal(result.days.length, 3);
  assert.equal(result.userId, undefined);
  const malformed = sample();
  malformed.days[0] = null;
  assert.throws(() => validateItinerary(malformed), { status: 400 });
  malformed.days[0] = { date: "2026-11-10", items: [null] };
  assert.throws(() => validateItinerary(malformed), { status: 400 });
});
test("Không chấp nhận người bằng 0 hoặc ngân sách âm / số lẻ", () => {
  for (const patch of [
    { travelers: 0 },
    { travelers: 1.5 },
    { budgetLimitVnd: -1 },
    { budgetLimitVnd: 1.5 },
  ])
    assert.throws(() => validateItinerary({ ...sample(), ...patch }));
});
test("Chặn trùng điểm trong ngày và giờ không hợp lệ", () => {
  const trip = sample();
  const item = {
    destinationId: "507f1f77bcf86cd799439011",
    visitTime: "09:00",
  };
  trip.days[0].items = [
    item,
    { ...item, destinationId: item.destinationId.toUpperCase() },
  ];
  assert.throws(() => validateItinerary(trip));
  trip.days[0].items = [{ ...item, visitTime: "24:00" }];
  assert.throws(() => validateItinerary(trip));
});
test("Cùng điểm được phép xuất hiện ở hai ngày khác nhau", () => {
  const trip = sample();
  trip.days[0].items = [{ destinationId: "507f1f77bcf86cd799439011" }];
  trip.days[1].items = [{ destinationId: "507f1f77bcf86cd799439011" }];
  assert.equal(validateItinerary(trip).days[1].items.length, 1);
});
test("Ngân sách tính đúng số người, override bằng 0 và giá còn thiếu", () => {
  const trip = {
    travelers: 2,
    budgetLimitVnd: 100000,
    days: [
      {
        items: [
          { destinationId: { estimatedCostPerPersonVnd: 200000 } },
          {
            destinationId: { estimatedCostPerPersonVnd: 300000 },
            customCostPerPersonVnd: 0,
          },
          { destinationId: { estimatedCostPerPersonVnd: null } },
        ],
      },
    ],
  };
  assert.deepEqual(budget(trip), {
    total: 400000,
    missing: 1,
    breakdown: { activities: 400000, accommodation: 0, transport: 0, food: 0, other: 0 },
    remaining: -300000,
    percent: 400,
  });
});
test("ObjectId sai bị từ chối", () => {
  assert.throws(() => objectId("bad"));
  assert.equal(
    objectId("507f1f77bcf86cd799439011"),
    "507f1f77bcf86cd799439011",
  );
});
test("Admin: từ chối URL ảnh nguy hiểm, tọa độ lẻ và tiền âm", () => {
  const destination = require("../data/destinations")[1];
  assert.equal(input(destination).name, destination.name);
  for (const patch of [
    { imageUrl: "javascript:alert(1)" },
    { latitude: 100 },
    { longitude: null },
    { estimatedCostPerPersonVnd: -1 },
  ])
    assert.throws(() => input({ ...destination, ...patch }));
});
