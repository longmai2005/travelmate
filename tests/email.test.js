const test = require("node:test");
const assert = require("node:assert/strict");
const mailer = require("../utils/mailer");
async function configured(run) {
  const previous = { BREVO_API_KEY: process.env.BREVO_API_KEY, MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL, APP_ORIGIN: process.env.APP_ORIGIN };
  Object.assign(process.env, { BREVO_API_KEY: "test-api-key-not-a-real-secret", MAIL_FROM_EMAIL: "sender@example.test", APP_ORIGIN: "https://travelmate.example.test" });
  try { await run(); } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const good = async url => url.endsWith("/account") ? reply(200, { relay: { enabled: true }, email: "private@example.test", marketingAutomation: { key: "must-not-leak" } }) : reply(200, { senders: [{ email: "sender@example.test", active: true }] });
test("Email: dùng API HTTPS đúng sender, không coi API chấp nhận là đã giao đến hộp thư", async () => configured(async () => {
  let calls = 0;
  const result = await mailer.sendResetEmail("recipient@example.test", "https://travelmate.example.test/reset-password#test-token", async (url, options) => {
    calls++; assert.equal(url, "https://api.brevo.com/v3/smtp/email"); assert.equal(options.method, "POST");
    const body = JSON.parse(options.body); assert.equal(body.sender.email, "sender@example.test"); assert.equal(body.to[0].email, "recipient@example.test"); assert.ok(body.htmlContent.includes("/reset-password#test-token"));
    return reply(201, { messageId: "provider-test-id" });
  });
  assert.deepEqual(result, { accepted: true }); assert.equal(calls, 1);
}));
test("Email: phân biệt SMTP key, API key sai và IP chưa được cho phép", async () => configured(async () => {
  process.env.BREVO_API_KEY = "xsmtpsib-test-not-real";
  assert.equal((await mailer.checkConfiguration(() => { throw new Error("Should not call API"); })).state, "smtp_key_instead_of_api_key");
  process.env.BREVO_API_KEY = "test-api-key-not-a-real-secret";
  const invalid = await mailer.checkConfiguration(async () => reply(401, { code: "unauthorized", message: "Key not found" }));
  assert.equal(invalid.state, "invalid_api_key"); assert.equal(invalid.blocking, true);
  const blocked = await mailer.checkConfiguration(async () => reply(401, { code: "unauthorized", message: "We have detected you are using an unrecognised IP address" }));
  assert.equal(blocked.state, "ip_not_authorized");
}));
test("Email: nhận biết tài khoản giao dịch chưa kích hoạt và người gửi chưa khớp/xác minh", async () => configured(async () => {
  const inactive = await mailer.checkConfiguration(async url => url.endsWith("/account") ? reply(200, { relay: { enabled: false } }) : good(url));
  assert.equal(inactive.state, "transactional_inactive"); assert.equal(inactive.blocking, true);
  for (const senders of [[], [{ email: "other@example.test", active: true }], [{ email: "sender@example.test", active: false }]]) {
    const status = await mailer.checkConfiguration(async url => url.endsWith("/senders") ? reply(200, { senders }) : good(url));
    assert.equal(status.state, "sender_not_verified"); assert.equal(status.blocking, true);
  }
}));
test("Email: chẩn đoán chỉ trả các cờ an toàn, không lộ tài khoản hoặc secret từ nhà cung cấp", async () => configured(async () => {
  const status = await mailer.checkConfiguration(good);
  assert.deepEqual(status, { state: "ready", blocking: false, transactional: true, sender: "verified" });
  assert.ok(!JSON.stringify(status).includes("must-not-leak")); assert.ok(!JSON.stringify(status).includes("private@example.test"));
  await assert.rejects(mailer.sendResetEmail("recipient@example.test", "https://example.test/#token", async () => reply(400, { code: "token-and-key-must-not-leak", message: "sender@example.test secret-key token-and-key-must-not-leak" })), error => {
    assert.deepEqual(mailer.safeDetails(error), { category: "provider_rejected", status: 400, code: "provider_error" });
    assert.ok(!error.message.includes("secret-key")); assert.ok(!JSON.stringify(error).includes("example.test")); return true;
  });
}));
test("Email: quyền đọc chẩn đoán hạn chế không tự chặn key vẫn có thể gửi thư", async () => configured(async () => {
  const status = await mailer.checkConfiguration(async () => reply(403, { code: "permission_denied", message: "Not allowed to read account" }));
  assert.equal(status.state, "unconfirmed"); assert.equal(status.blocking, false);
}));
test("Email: lỗi mạng/timeout không in thông tin request và liên kết khôi phục", async () => configured(async () => {
  await assert.rejects(mailer.sendResetEmail("recipient@example.test", "https://example.test/#sensitive-token", async () => { const e = new Error("secret-key sensitive-token"); e.name = "TimeoutError"; throw e; }), error => {
    assert.deepEqual(mailer.safeDetails(error), { category: "provider_timeout" }); assert.ok(!error.message.includes("sensitive-token")); return true;
  });
}));

test("Email: phản hồi thiếu mã chấp nhận không được ghi là gửi thành công", async () => configured(async () => {
  await assert.rejects(mailer.sendResetEmail("recipient@example.test", "https://example.test/#token", async () => reply(201, {})), error => {
    assert.deepEqual(mailer.safeDetails(error), { category: "provider_invalid_response" }); return true;
  });
  assert.deepEqual(mailer.safeDetails({ emailDetails: { category: "provider_rejected", status: 400, code: "secret-code", raw: "secret body" } }), { category: "provider_rejected", status: 400 });
}));
