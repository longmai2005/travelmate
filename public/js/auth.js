TM.openAuth = function (mode = "login") {
  if (document.querySelector("#auth-dialog")?.open) return;
  const register = mode === "register";
  const dialog = this.dialog(
    `<div class="modal-body"><div class="auth-brand brand"><img src="/images/logo.svg" alt=""><span>Travel<span>Mate</span></span></div><div class="modal-heading"><div><h2>${register ? "Bắt đầu câu chuyện của bạn." : "Chào bạn, người lữ hành."}</h2><p>${register ? "Tạo tài khoản để lưu những hành trình yêu thích." : "Đăng nhập để tiếp tục những hành trình đang chờ."}</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form id="auth-form" class="auth-form">${register ? '<label class="form-field">Họ và tên<input name="fullName" required maxlength="100" autocomplete="name" placeholder="Tên bạn là gì?"></label>' : ""}<label class="form-field">Email<input type="email" name="email" required maxlength="254" autocomplete="email" placeholder="ban@example.com"></label><label class="form-field">Mật khẩu<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="${register ? "new-password" : "current-password"}" placeholder="Ít nhất 8 ký tự"></label>${register ? '<label class="form-field">Xác nhận mật khẩu<input name="confirmPassword" type="password" required minlength="8" maxlength="72" autocomplete="new-password" placeholder="Nhập lại mật khẩu"></label>' : ""}<div class="form-error" role="alert"></div><button type="submit" class="btn">${register ? "Tạo tài khoản" : "Đăng nhập"} <i data-lucide="arrow-right"></i></button></form><p class="auth-switch">${register ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <button id="auth-switch">${register ? "Đăng nhập" : "Đăng ký ngay"}</button></p></div>`,
    "",
    register ? "Đăng ký" : "Đăng nhập",
  );
  dialog.id = "auth-dialog";
  if (!register) {
    dialog.querySelector("form").insertAdjacentHTML("afterend", '<p class="auth-switch"><button id="forgot-password">Quên mật khẩu?</button></p>');
    dialog.querySelector("#forgot-password").onclick = () => { dialog.close(); TM.forgotPassword(); };
  }
  dialog.querySelector("#auth-switch").addEventListener("click", () => {
    dialog.close();
    this.openAuth(register ? "login" : "register");
  });
  dialog.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      if (register && values.password !== values.confirmPassword)
        throw new Error("Mật khẩu xác nhận chưa khớp.");
      const result = await api.request(
        `/auth/${register ? "register" : "login"}`,
        { method: "POST", body: values },
      );
      this.user = result.user;
      SessionIdle.start(result.user, result.session);
      await this.loadFavorites();
      this.renderHeader();
      dialog.close();
      document.dispatchEvent(new Event("authchange"));
      this.toast(`Chào ${this.user.fullName}! Hành trình của bạn đang chờ.`);
      if (!this.pendingAction && !register && this.user.role === "admin") {
        location.assign("/admin");
        return;
      }
      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        await action();
      }
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
};
TM.ready = (async () => {
  try {
    let { user, session } = await api.request("/auth/me");
    const logout = JSON.parse(localStorage.getItem("tm-auth-event") || "null");
    if (user && logout?.userId === user._id && logout.generation === session?.generation) {
      await api.request("/auth/logout", { method: "POST" }); user = null; session = null; api.token = null;
    }
    TM.user = user;
    SessionIdle.start(user, session);
    if (!user) { const cached = OfflineTrips.identity(); if (cached) await OfflineTrips.clearUser(cached.user._id); }
    if (user && document.body.dataset.page !== "admin")
      await TM.loadFavorites();
  } catch (error) {
    const cached = !error.status && document.body.dataset.page === "offline" ? OfflineTrips.identity() : null;
    if (cached) { TM.offlineMode = true; TM.user = cached.user; SessionIdle.start(cached.user, cached.session); }
    else TM.toast(error.message, true);
  }
  TM.renderHeader();
  return TM.user;
})();

TM.forgotPassword = function() {
  const dialog = TM.dialog('<div class="modal-body"><div class="modal-heading"><h2>Khôi phục mật khẩu</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Nhập email tài khoản để nhận liên kết dùng một lần trong 15 phút.</p><form><label class="form-field">Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Gửi liên kết khôi phục</button></form><p id="reset-status" role="status"></p></div>');
  dialog.querySelector("form").onsubmit = async event => {
    event.preventDefault(); const form = event.target, b = form.querySelector("button"); b.disabled = true;
    try { const result = await api.request("/auth/forgot-password", {method:"POST",body:Object.fromEntries(new FormData(form))}); dialog.querySelector("#reset-status").textContent = result.message; form.hidden = true; }
    catch(e) { form.querySelector(".form-error").textContent = e.message; b.disabled = false; }
  };
};
TM.ready.then(() => { if (new URLSearchParams(location.search).get("login") === "1" && !TM.user) TM.openAuth(); });
