TM.openAuth = function (mode = "login") {
  if (document.querySelector("#auth-dialog")?.open) return;
  const register = mode === "register";
  const dialog = this.dialog(
    `<div class="modal-body"><div class="auth-brand brand"><img src="/images/logo.svg" alt=""><span>Travel<span>Mate</span></span></div><div class="modal-heading"><div><h2>${register ? "Bắt đầu câu chuyện của bạn." : "Chào bạn, người lữ hành."}</h2><p>${register ? "Tạo tài khoản để lưu những hành trình yêu thích." : "Đăng nhập để tiếp tục những hành trình đang chờ."}</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form id="auth-form" class="auth-form">${register ? '<label class="form-field">Họ và tên<input name="fullName" required maxlength="100" autocomplete="name" placeholder="Tên bạn là gì?"></label>' : ""}<label class="form-field">Email<input type="email" name="email" required maxlength="254" autocomplete="email" placeholder="ban@example.com"></label><label class="form-field">Mật khẩu<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="${register ? "new-password" : "current-password"}" placeholder="Ít nhất 8 ký tự"></label>${register ? '<label class="form-field">Xác nhận mật khẩu<input name="confirmPassword" type="password" required minlength="8" maxlength="72" autocomplete="new-password" placeholder="Nhập lại mật khẩu"></label>' : ""}<div class="form-error" role="alert"></div><button type="submit" class="btn">${register ? "Tạo tài khoản" : "Đăng nhập"} <i data-lucide="arrow-right"></i></button></form><p class="auth-switch">${register ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <button id="auth-switch">${register ? "Đăng nhập" : "Đăng ký ngay"}</button></p></div>`,
    "",
    register ? "Đăng ký" : "Đăng nhập",
  );
  dialog.id = "auth-dialog";
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
    const { user } = await api.request("/auth/me");
    TM.user = user;
    if (user && document.body.dataset.page !== "admin")
      await TM.loadFavorites();
  } catch (error) {
    TM.toast(error.message, true);
  }
  TM.renderHeader();
  return TM.user;
})();
