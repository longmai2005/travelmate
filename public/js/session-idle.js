window.SessionIdle = {
  user: null, state: null, lastInteraction: 0, lastSync: 0, pending: false, syncing: false,
  start(user, session) {
    clearInterval(this.timer); clearTimeout(this.flushTimer);
    this.warning?.close(); this.warning = null;
    this.user = user; this.state = session; this.pending = false;
    if (!user || !session) return;
    this.lastInteraction = session.expiresAt - session.timeoutMs;
    this.offset = session.serverNow - Date.now();
    try { const stored = JSON.parse(localStorage.getItem("tm-idle-session")); if (stored?.userId === user._id && stored.generation === session.generation) this.lastInteraction = Math.max(this.lastInteraction,stored.lastInteraction); } catch {}
    this.lastSync = Date.now();
    this.pending = this.lastInteraction > session.expiresAt - session.timeoutMs && Date.now() + this.offset - this.lastInteraction <= 15000;
    if (this.pending) this.flushTimer = setTimeout(() => this.flush(), 0);
    localStorage.setItem("tm-idle-session", JSON.stringify({ userId: user._id, role: user.role, lastInteraction: this.lastInteraction, timeoutMs: session.timeoutMs, generation: session.generation, offset: this.offset }));
    this.timer = setInterval(() => this.check(), 1000);
    this.check();
  },
  activity(event) {
    if (!event.isTrusted || !this.user || document.hidden) return;
    if (this.check()) return;
    const now = Date.now();
    if (now - (this.lastEvent || 0) < 1000) return;
    this.lastEvent = now;
    this.lastInteraction = now + this.offset;
    this.pending = true;
    this.warning?.close(); this.warning = null;
    localStorage.setItem("tm-idle-session", JSON.stringify({ userId: this.user._id, role: this.user.role, lastInteraction: this.lastInteraction, timeoutMs: this.state.timeoutMs, generation: this.state.generation, offset: this.offset }));
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), Math.max(0, 10000 - (now - this.lastSync)));
  },
  async flush() {
    if (!this.user || !this.pending || this.syncing || !navigator.onLine) return;
    const interaction = this.lastInteraction;
    if (Date.now() + this.offset - interaction > 15000) { this.pending = false; return; }
    this.pending = false; this.syncing = true;
    try {
      const age = Math.max(0, Math.min(15000, Math.round(Date.now() + this.offset - interaction)));
      const result = await api.request("/auth/activity", { method: "POST", keepalive: document.hidden, body: { activityAgeMs: age } });
      this.state = result.session;
      this.offset = result.session.serverNow - Date.now(); this.lastSync = Date.now();
    } catch (error) {
      if (error.status === 401) this.expire();
      else this.pending = true;
    } finally { this.syncing = false; }
  },
  check() {
    if (!this.user || !this.state) return false;
    const remaining = this.lastInteraction + this.state.timeoutMs - (Date.now() + this.offset);
    if (remaining <= 0) { this.expire(); return true; }
    if (remaining <= 30000 && !this.warning && !document.hidden) {
      this.warning = TM.dialog('<div class="modal-body"><div class="modal-heading"><h2>Phiên sắp hết hạn</h2></div><p>Bạn đã ngừng thao tác một lúc. Phiên sẽ tự đăng xuất sau khoảng 30 giây để bảo vệ tài khoản.</p><div class="form-actions"><button class="btn" id="keep-session">Tiếp tục sử dụng</button></div></div>', "", "Cảnh báo hết phiên");
      this.warning.querySelector("button").addEventListener("click", () => { this.pending = true; this.flush(); this.warning?.close(); this.warning = null; });
    }
    return false;
  },
  expire(broadcast = true, reason = "idle") {
    if (!this.user) return;
    const user = this.user, generation = this.state?.generation;
    this.user = null; clearInterval(this.timer); clearTimeout(this.flushTimer);
    this.warning?.close(); this.warning = null;
    document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
    document.dispatchEvent(new CustomEvent("before-session-clear", { detail: { user, reason } }));
    window.OfflineTrips?.clearUser(user._id);
    TM.user = null; TM.favorites.clear(); api.token = null; TM.pendingAction = null;
    localStorage.removeItem("tm-idle-session");
    if (broadcast) localStorage.setItem("tm-auth-event", JSON.stringify({ userId: user._id, generation, reason, at: Date.now() }));
    // The server rejects expired sessions even if this best-effort request cannot reach it.
    if (broadcast) api.request("/auth/logout", { method: "POST" }).catch(() => {});
    if (document.body.dataset.page === "admin") { location.assign("/?session=expired"); return; }
    TM.renderHeader(); document.dispatchEvent(new CustomEvent("authchange", { detail: { reason: "idle" } }));
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Phiên đăng nhập đã kết thúc</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>${reason === "idle" ? "Bạn đã được đăng xuất do không hoạt động. Thay đổi lịch trình chưa lưu được giữ tạm trong tab này để khôi phục khi đăng nhập lại đúng tài khoản." : "Phiên đã đăng xuất hoặc không còn hiệu lực. Đăng nhập lại để tiếp tục."}</p><div class="form-actions"><button class="btn" id="idle-login">Đăng nhập lại</button></div></div>`, "", "Phiên đã kết thúc");
    dialog.querySelector("#idle-login").addEventListener("click", () => { dialog.close(); TM.openAuth(); });
  },
  stop(user, broadcast = true) {
    const generation = this.state?.generation;
    clearInterval(this.timer); clearTimeout(this.flushTimer); this.user = null; this.state = null;
    this.warning?.close(); this.warning = null;
    localStorage.removeItem("tm-idle-session");
    if (user) {
      window.OfflineTrips?.clearUser(user._id);
      if (broadcast) localStorage.setItem("tm-auth-event", JSON.stringify({ userId: user._id, generation, reason: "logout", at: Date.now() }));
    }
  },
};
for (const type of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) document.addEventListener(type, event => SessionIdle.activity(event), { passive: true, capture: true });
document.addEventListener("visibilitychange", () => { if (document.hidden) SessionIdle.flush(); else SessionIdle.check(); });
window.addEventListener("pagehide", () => SessionIdle.flush());
window.addEventListener("online", () => { SessionIdle.check(); SessionIdle.flush(); });
document.addEventListener("sessionexpired", event => SessionIdle.expire(true, event.detail?.reason || "idle"));
window.addEventListener("storage", event => {
  try {
    if (event.key === "tm-idle-session" && event.newValue && SessionIdle.user) {
      const state = JSON.parse(event.newValue);
      if (state.userId === SessionIdle.user._id && state.generation === SessionIdle.state?.generation) { SessionIdle.lastInteraction = Math.max(SessionIdle.lastInteraction, state.lastInteraction); SessionIdle.check(); }
    }
    if (event.key === "tm-auth-event" && event.newValue && SessionIdle.user) {
      const data = JSON.parse(event.newValue);
      if (data.userId === SessionIdle.user._id && data.generation === SessionIdle.state?.generation) SessionIdle.expire(false, data.reason || "logout");
    }
  } catch { /* Ignore malformed browser storage. */ }
});
