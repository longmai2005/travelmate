const test = require("node:test");
const assert = require("node:assert/strict");
const { todayInVietnam, tripStatus, safeUser } = require("../utils/adminData");
test("Ngày quản trị dùng giờ Việt Nam, kể cả sát nửa đêm và sang năm", () => {
  assert.equal(todayInVietnam(new Date("2026-10-17T16:59:59Z")), "2026-10-17");
  assert.equal(todayInVietnam(new Date("2026-10-17T17:00:00Z")), "2026-10-18");
  assert.equal(todayInVietnam(new Date("2026-12-31T17:00:00Z")), "2027-01-01");
});
test("Trạng thái lịch trình bao gồm cả ngày khởi hành và ngày kết thúc", () => {
  const trip = { startDate: "2026-10-17", endDate: "2026-10-19" };
  assert.equal(tripStatus(trip, "2026-10-16"), "upcoming");
  assert.equal(tripStatus(trip, "2026-10-17"), "ongoing");
  assert.equal(tripStatus(trip, "2026-10-19"), "ongoing");
  assert.equal(tripStatus(trip, "2026-10-20"), "completed");
});
test("Hồ sơ admin dùng allowlist và tương thích tài khoản cũ chưa có isActive", () => {
  const user = safeUser({
    _id: "a",
    fullName: "A",
    email: "a@example.test",
    role: "user",
    passwordHash: "private",
    sessionVersion: 99,
  });
  assert.equal(user.isActive, true);
  assert.ok(!("passwordHash" in user));
  assert.ok(!("sessionVersion" in user));
});
