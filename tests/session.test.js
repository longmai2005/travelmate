const test = require("node:test");
const assert = require("node:assert/strict");
const { idleLimit, sessionState } = require("../utils/sessionIdle");
test("Giới hạn idle đúng 5 phút user và 10 phút admin, kể cả đúng thời điểm hết hạn", () => {
  assert.equal(idleLimit("user"), 300000);
  assert.equal(idleLimit("admin"), 600000);
  assert.equal(idleLimit("forged"), 300000);
  for (const role of ["user", "admin"]) {
    const session = { idleRole: role, lastActivityAt: 1000 };
    assert.equal(sessionState(session, 1000 + idleLimit(role) - 1).expired, false);
    assert.equal(sessionState(session, 1000 + idleLimit(role)).expired, true);
  }
  assert.equal(sessionState({ idleRole: "user" }, 1000).expired, true);
});
