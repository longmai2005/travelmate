const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const connect = require("../config/database");
const Destination = require("../models/Destination");
const catalogue = require("../data/destinations");

test("Khám phá danh mục lớn qua Express/MongoDB, tìm không dấu và thống kê chỉ điểm công khai", { timeout: 30000 }, async t => {
  const database = `travelmate_discovery_test_${process.pid}_${crypto.randomBytes(4).toString("hex")}`;
  process.env.SESSION_SECRET = crypto.randomBytes(48).toString("hex"); process.env.NODE_ENV = "test";
  await connect(`${process.env.TEST_MONGO_BASE_URI || "mongodb://127.0.0.1:27017"}/${database}`);
  let server;
  try {
    await Destination.init();
    await Destination.insertMany(catalogue);
    await Destination.create({ ...catalogue[0], slug: "hidden-only-test", name: "Điểm ẩn", province: "Tỉnh chỉ có điểm ẩn", isActive: false });
    server = require("../app")().listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const get = async query => { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/destinations?${query}`); assert.equal(response.status, 200); return response.json(); };
    await t.test("Mọi trang và tìm kiếm đều tiếp cận được điểm nằm sau mục thứ 100", async () => {
      const first = await get("limit=100"), last = await get("limit=100&page=2");
      assert.equal(first.total, catalogue.length);
      assert.equal(first.items.length + last.items.length, catalogue.length);
      assert.equal(new Set([...first.items, ...last.items].map(d => d._id)).size, catalogue.length);
      const target = last.items[0], found = await get(new URLSearchParams({ q: target.name }));
      assert.ok(found.items.some(d => d._id === target._id));
      assert.ok(!first.provinces.includes("Tỉnh chỉ có điểm ẩn"));
      assert.equal(first.provinceCounts.reduce((n, p) => n + p.total, 0), catalogue.length);
    });
    await t.test("Tìm tiếng Việt không dấu và lọc tỉnh không làm mất danh sách địa phương", async () => {
      const found = await get(new URLSearchParams({ q: "chua linh ung", province: "Đà Nẵng" }));
      assert.ok(found.items.some(d => d.name === "Chùa Linh Ứng – Bãi Bụt"));
      assert.ok(found.items.every(d => d.province === "Đà Nẵng"));
      assert.equal(found.provinceCounts.find(p => p.province === "Đà Nẵng").total, 12);
      assert.equal(found.provinces.length, 12);
    });
    await t.test("Giá chưa xác minh được tìm riêng và không bị coi là giá thấp hay miễn phí", async () => {
      const unknown = await get("budget=unknown&limit=100"), low = await get("budget=low&limit=100");
      assert.equal(unknown.total, catalogue.filter(d => d.estimatedCostPerPersonVnd == null).length);
      assert.ok(unknown.items.every(d => d.estimatedCostPerPersonVnd == null));
      assert.ok(low.items.every(d => d.estimatedCostPerPersonVnd != null));
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.name === database && database.startsWith("travelmate_discovery_test_")) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
