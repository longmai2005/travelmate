(() => {
  const token = location.hash.slice(1); history.replaceState(null,"",location.pathname);
  const el = document.querySelector("#reset-content");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { el.innerHTML = '<section class="feature-card"><h2>Liên kết chưa hợp lệ</h2><p>Hãy mở đầy đủ liên kết trong email hoặc yêu cầu liên kết mới ở mục Quên mật khẩu.</p><button class="btn" id="reset-login">Mở đăng nhập</button></section>'; el.querySelector("button").onclick = () => TM.openAuth(); return; }
  el.innerHTML = '<section class="feature-card"><form><label class="form-field">Mật khẩu mới<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label><label class="form-field">Xác nhận mật khẩu<input name="confirmPassword" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Đặt lại mật khẩu</button></form></section>';
  el.querySelector("form").onsubmit = async event => {
    event.preventDefault(); const form = event.target, b = form.querySelector("button"); b.disabled = true;
    try { const result = await api.request("/auth/reset-password", { method:"POST",body:{...Object.fromEntries(new FormData(form)),token} }); SessionIdle.stop(TM.user); TM.user = null; api.token = null; TM.renderHeader(); el.innerHTML = `<section class="feature-card"><h2>Đã đặt lại mật khẩu</h2><p>${TM.escape(result.message)}</p><a class="btn" href="/?login=1">Về trang đăng nhập</a></section>`; }
    catch(e) { form.querySelector(".form-error").textContent = e.message; b.disabled = false; }
  };
})();
