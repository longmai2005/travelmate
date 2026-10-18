function renderAccount() {
  const el = document.querySelector("#account-content");
  if (!TM.user) { el.innerHTML = '<div class="empty-state"><h2>Đăng nhập để quản lý tài khoản</h2><button class="btn" id="account-login">Đăng nhập</button></div>'; el.querySelector("button").onclick = () => TM.openAuth(); return; }
  el.innerHTML = `<div class="account-grid"><section class="feature-card"><h2>Hồ sơ</h2><p class="field-help">${TM.user.role === "admin" ? "Quản trị viên · Tự thoát sau 10 phút không hoạt động" : "Thành viên · Tự thoát sau 5 phút không hoạt động"}</p><form id="profile-form"><label class="form-field">Họ và tên<input name="fullName" maxlength="100" required value="${TM.escape(TM.user.fullName)}" autocomplete="name"></label><label class="form-field">Email<input type="email" readonly value="${TM.escape(TM.user.email)}" autocomplete="email"></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Lưu hồ sơ</button></form></section><section class="feature-card"><h2>Đổi mật khẩu</h2><p class="field-help">Đổi mật khẩu sẽ đăng xuất các phiên khác. Phiên hiện tại được cấp mới.</p><form id="password-form"><label class="form-field">Mật khẩu hiện tại<input name="currentPassword" type="password" required autocomplete="current-password" maxlength="72"></label><label class="form-field">Mật khẩu mới<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label><label class="form-field">Xác nhận mật khẩu mới<input name="confirmPassword" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Đổi mật khẩu</button></form></section></div>`;
  for (const [id,path] of [["profile-form","profile"],["password-form","password"]]) el.querySelector(`#${id}`).onsubmit = async event => {
    event.preventDefault(); const form = event.target, b = form.querySelector("button"); b.disabled = true; form.querySelector(".form-error").textContent = "";
    try {
      const result = await api.request(`/auth/${path}`, { method: "PUT", body: Object.fromEntries(new FormData(form)) });
      if (result.session) { SessionIdle.stop(TM.user); SessionIdle.start(result.user,result.session); }
      TM.user = result.user; TM.renderHeader(); if (path === "password") form.reset(); TM.toast(path === "password" ? "Đã đổi mật khẩu. Các phiên cũ đã hết hiệu lực." : "Đã cập nhật hồ sơ.");
    } catch (e) { form.querySelector(".form-error").textContent = e.message; } finally { b.disabled = false; }
  };
}
TM.ready.then(renderAccount); document.addEventListener("authchange", renderAccount);
