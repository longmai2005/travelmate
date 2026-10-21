const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Destination = require("../models/Destination");
const catalogue = require("../data/destinations");
const legacy = require("../data/legacy-destinations");
const plan = require("../utils/catalogueSync");
const { suggest, validateSuggestion } = require("../utils/suggestions");

test("Danh mục mở rộng: dữ liệu hợp lệ, nguồn không trống, ảnh có tệp và giấy phép, giữ mọi slug cũ", async () => {
  assert.ok(catalogue.length > 100);
  assert.equal(new Set(catalogue.map(d => d.slug)).size, catalogue.length);
  for (const previous of legacy) assert.ok(catalogue.some(d => d.slug === previous.slug));
  const provinces = new Set(catalogue.map(d => d.province));
  for (const province of provinces) assert.ok(catalogue.filter(d => d.province === province).length >= 8);
  for (const destination of catalogue) {
    await new Destination(destination).validate();
    assert.equal(new URL(destination.sourceUrl).protocol, "https:", destination.name);
    assert.ok(fs.existsSync(path.join(__dirname, "../public", destination.imageUrl)), destination.name);
    if (destination.imageKind !== "illustration") {
      assert.ok(destination.imageCredit, destination.name);
      assert.equal(new URL(destination.imageSourceUrl).hostname, "commons.wikimedia.org");
      assert.match(destination.imageLicense, /^(CC BY|CC0|Public domain)/);
    }
  }
});

test("Nhập danh mục giữ chỉnh sửa admin, ObjectId, giá, trạng thái và nguồn tự nhập; chạy lại không đổi", () => {
  const old = { ...legacy[0], _id: "keep-reference", description: "Nội dung do admin cập nhật", estimatedCostPerPersonVnd: 123000, isActive: false, imageUrl: "https://example.test/custom.jpg", sourceUrl: "https://example.test/custom", verifiedOn: "" };
  const target = catalogue.find(d => d.slug === old.slug);
  const change = plan([old], [target]);
  assert.equal(change.inserts.length, 0);
  const merged = { ...old, ...change.updates[0].patch };
  for (const key of ["_id", "description", "estimatedCostPerPersonVnd", "isActive", "imageUrl", "sourceUrl", "verifiedOn"]) assert.equal(merged[key], old[key], key);
  assert.equal(plan([merged], [target]).updates.length, 0);
  const credited = { ...target, imageCredit: "Tác giả admin đã đối chiếu" };
  assert.equal(plan([credited], [target]).updates.length, 0);
});

test("Gợi ý có các lựa chọn ngoài phương án và đổi phương án được, không trộn tỉnh, không mất điểm dài một ngày", () => {
  const input = validateSuggestion({ province: "Đà Nẵng", categories: [], startDate: "2026-12-01", endDate: "2026-12-01", travelers: 1, budgetLimitVnd: 10000000 });
  const destinations = catalogue.filter(d => d.province === input.province).map((d, i) => ({ ...d, _id: String(i) }));
  const first = suggest(input, destinations), ids = first.days[0].items.map(i => i.destinationId._id).join(",");
  assert.equal(first.availableCount, destinations.length);
  assert.equal(first.alternativesCount + first.days[0].items.length, destinations.length);
  assert.ok(first.alternatives.every(d => d.province === input.province));
  assert.ok(Array.from({ length: 5 }, (_, i) => suggest({ ...input, variant: i + 1 }, destinations)).some(r => r.days[0].items.map(i => i.destinationId._id).join(",") !== ids));
  const dayTrip = suggest({ ...input, categories: ["entertainment"] }, destinations.filter(d => d.name === "Bà Nà Hills"));
  assert.equal(dayTrip.days[0].items[0].destinationId.name, "Bà Nà Hills");
  assert.throws(() => validateSuggestion({ ...input, startDate: "2026-12-01", endDate: "2026-12-01", variant: -1 }));
});
