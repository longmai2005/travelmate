const API = "https://api.brevo.com/v3";
const passwordResetEmail = require("./passwordResetEmail");
const knownCodes = new Set(["unauthorized", "permission_denied", "invalid_parameter", "missing_parameter", "not_enough_credits", "account_inactive", "invalid_request", "method_not_allowed", "out_of_range", "duplicate_parameter", "document_not_found"]);
let cachedHealth, healthUntil = 0, healthKey;
function settings() {
  return { key: (process.env.BREVO_API_KEY || "").trim(), sender: (process.env.MAIL_FROM_EMAIL || "").trim().toLowerCase(), origin: (process.env.APP_ORIGIN || "").trim() };
}
function configured() { const s = settings(); return !!(s.key && s.sender && s.origin); }
function providerError(status, body = {}) {
  const code = knownCodes.has(body.code) ? body.code : "provider_error";
  // Never retain/log a provider message: it may echo an address, request body or key.
  const message = typeof body.message === "string" ? body.message : "";
  let category = status === 401 ? "invalid_api_key" : status === 429 ? "rate_limited" : "provider_rejected";
  if (/unrecogni[sz]ed.*ip|ip.*not.*authori[sz]ed|ip address.*(block|allow)/i.test(message)) category = "ip_not_authorized";
  else if (/account.*(not.*(activ|enabl)|deactiv|suspend)|smtp.*(not.*activ|deactiv)/i.test(message)) category = "transactional_inactive";
  else if (/sender.*(not.*(valid|verif|authori)|invalid|unverif)/i.test(message)) category = "sender_not_verified";
  else if (code === "not_enough_credits") category = "credits_exhausted";
  const error = new Error("Email provider rejected the request");
  error.emailDetails = { category, status, code };
  return error;
}
function safeDetails(error) {
  const categories = new Set(["invalid_api_key", "rate_limited", "provider_rejected", "ip_not_authorized", "transactional_inactive", "sender_not_verified", "credits_exhausted", "provider_timeout", "provider_unreachable", "provider_invalid_response"]);
  const detail = error?.emailDetails;
  if (detail && categories.has(detail.category)) return { category: detail.category,
    ...(Number.isInteger(detail.status) && detail.status >= 100 && detail.status <= 599 ? { status: detail.status } : {}),
    ...(knownCodes.has(detail.code) || detail.code === "provider_error" ? { code: detail.code } : {}) };
  return { category: ["TimeoutError", "AbortError"].includes(error?.name) ? "provider_timeout" : "provider_unreachable" };
}
async function request(endpoint, { fetcher = fetch, method = "GET", body } = {}) {
  let response;
  try {
    response = await fetcher(`${API}${endpoint}`, { method, signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json", "api-key": settings().key }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch (error) {
    const safe = new Error("Email provider could not be reached");
    safe.emailDetails = safeDetails(error); throw safe;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw providerError(response.status, data);
  return data;
}
async function checkConfiguration(fetcher = fetch) {
  const s = settings();
  if (!configured()) return { state: "not_configured", blocking: true };
  if (s.key.startsWith("xsmtpsib-")) return { state: "smtp_key_instead_of_api_key", blocking: true };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.sender)) return { state: "invalid_sender_address", blocking: true };
  const [account, senders] = await Promise.allSettled([request("/account", { fetcher }), request("/senders", { fetcher })]);
  const failures = [account, senders].filter(r => r.status === "rejected").map(r => safeDetails(r.reason));
  const hardFailure = failures.find(d => ["invalid_api_key", "ip_not_authorized", "transactional_inactive"].includes(d.category));
  if (hardFailure) return { state: hardFailure.category, blocking: true, ...hardFailure };
  const transactional = account.status === "fulfilled" && typeof account.value.relay?.enabled === "boolean" ? account.value.relay.enabled : null;
  const sender = senders.status === "fulfilled" && Array.isArray(senders.value.senders) ? senders.value.senders.find(item => typeof item.email === "string" && item.email.toLowerCase() === s.sender) : null;
  const senderState = senders.status === "rejected" || !Array.isArray(senders.value?.senders) ? "unknown" : !sender ? "missing" : sender.active === true ? "verified" : "unverified";
  if (transactional === false) return { state: "transactional_inactive", blocking: true, sender: senderState };
  if (["missing", "unverified"].includes(senderState)) return { state: "sender_not_verified", blocking: true, sender: senderState };
  return { state: transactional === true && senderState === "verified" ? "ready" : "unconfirmed", blocking: false, transactional, sender: senderState, ...(failures.length ? { diagnostic: failures[0] } : {}) };
}
function deliveryHealth() {
  const s = settings(), key = `${s.key}\0${s.sender}\0${s.origin}`;
  if (!cachedHealth || key !== healthKey || Date.now() >= healthUntil) {
    healthKey = key; healthUntil = Date.now() + 60000;
    cachedHealth = checkConfiguration().then(result => {
      console.info("Email configuration:", JSON.stringify(result));
      return result;
    });
  }
  return cachedHealth;
}
async function sendResetEmail(email, url, fetcher = fetch) {
  if (!configured()) throw new Error("Email is not configured");
  const result = await request("/smtp/email", { fetcher, method: "POST", body: {
    sender: { name: "TravelMate", email: settings().sender }, to: [{ email }],
    ...passwordResetEmail(url)
  } });
  if (typeof result.messageId !== "string" || !result.messageId) {
    const error = new Error("Email provider acknowledgement is missing");
    error.emailDetails = { category: "provider_invalid_response" }; throw error;
  }
  return { accepted: true };
}
module.exports = { configured, sendResetEmail, checkConfiguration, deliveryHealth, safeDetails };
