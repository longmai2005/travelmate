const test = require("node:test");
const assert = require("node:assert/strict");
const { captureDate } = require("../utils/photoMetadata");
const catalogue = require("../data/destinations");
const history = require("../data/catalogue-photo-history.json");
const plan = require("../utils/catalogueSync");
const input = require("../utils/destinationInput");

test("Ngày chụp chỉ lấy từ ngày gốc; không dùng ngày tải lên, ngày không hợp lệ hay tương lai", () => {
  const today = "2026-10-21";
  for (const value of ["2008-02-28", "2024-07-31 12:07:08", "Taken on 23 November 2024, 14:15:21", "12 March 2025<span> </span>(according to Exif data)", "2011"])
    assert.ok(captureDate(value, today), value);
  assert.equal(captureDate("12 March 2025 (according to Exif data)", today), "2025-03-12");
  for (const value of ["", "6 December 2008 (upload date)", "before 13 April 2024", "0001-03-20", "2024-02-30", "2027-01-01", "2027", "2024-01-01<script>bad</script>"])
    assert.equal(captureDate(value, today), "", value);
});

test("Thay bộ ảnh đã phát hành có điều kiện, giữ nguyên ảnh và ghi công admin đã sửa", () => {
  const known = history.find(d => d.imageSourceUrl);
  const old = { ...catalogue.find(d => d.slug === known.slug), ...known, imageTakenOn: "", updatedAt: new Date("2026-10-20") };
  const next = { ...old, imageUrl: "/images/destinations/new-photo-2025.jpg", imageCredit: "Tác giả mới", imageTakenOn: "2025-02-01" };
  const result = plan([old], [next]);
  assert.equal(result.updates[0].patch.imageUrl, next.imageUrl);
  assert.equal(result.updates[0].patch.imageCredit, next.imageCredit);
  assert.equal(result.updates[0].patch.imageTakenOn, next.imageTakenOn);
  assert.equal(result.updates[0].filter.updatedAt, old.updatedAt);
  assert.equal(plan([{ ...old, ...result.updates[0].patch }], [next]).updates.length, 0);
  for (const patch of [{ imageUrl: "/images/admin.jpg" }, { imageCredit: "Admin sửa ghi công" }, { imageTakenOn: "2024" }]) {
    const protectedResult = plan([{ ...old, ...patch }], [next]);
    assert.ok(!protectedResult.updates.some(update => Object.keys(update.patch).some(key => key.startsWith("image"))));
  }
});

test("Admin nhập ngày/năm chụp phải có nguồn, đúng ngày thực và không ở tương lai", () => {
  const d = catalogue.find(d => d.imageSourceUrl);
  assert.equal(input({ ...d, imageTakenOn: "2025" }).imageTakenOn, "2025");
  assert.equal(input({ ...d, imageTakenOn: "2024-02-29" }).imageTakenOn, "2024-02-29");
  for (const patch of [{ imageTakenOn: "2023-02-29" }, { imageTakenOn: "2099" }, { imageTakenOn: "2025", imageSourceUrl: "" }])
    assert.throws(() => input({ ...d, ...patch }));
});

test("Chỉ đường đến địa danh; không dùng tâm vịnh hoặc tọa độ mẫu làm cổng vào", () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const context = { window: {}, document: { addEventListener() {}, querySelector: () => null }, URL };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("public/js/common.js", "utf8"), context);
  const destination = { name: "Vịnh Hạ Long", province: "Quảng Ninh", latitude: 20.9, longitude: 107.2 };
  const url = new URL(context.TM.googleMapsUrl(destination, true));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.searchParams.get("destination"), "Vịnh Hạ Long, Quảng Ninh, Việt Nam");
  assert.equal(url.searchParams.get("api"), "1");
});
