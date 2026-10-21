window.FeedbackUI = {
  statuses: { open: "Chờ xử lý", in_review: "Đang kiểm tra", resolved: "Đã giải quyết", dismissed: "Đã đóng" },
  types: { price: "Giá tham khảo", address: "Địa chỉ / vị trí", closed: "Điểm đã đóng cửa", other: "Góp ý khác" },
  history(item) {
    return item.history?.length ? `<div class="feedback-history">${item.history.map(h => `<article><strong>${TM.escape(h.adminName)} · ${this.statuses[h.status]}</strong><p class="preserve-lines">${TM.escape(h.reply)}</p><small>${new Date(h.createdAt).toLocaleString("vi-VN")}</small></article>`).join("")}</div>` : '<p class="field-help">Chưa có trả lời từ quản trị viên.</p>';
  },
  card(item) {
    return `<article class="feedback-card"><span class="badge">${this.statuses[item.status]}</span><h3>${TM.escape(item.subject)}</h3><small>${this.types[item.type]}${item.destinationId ? ` · ${TM.escape(item.destinationId.name)}` : ""} · ${new Date(item.createdAt).toLocaleString("vi-VN")}</small><p class="preserve-lines">${TM.escape(item.content)}</p>${this.history(item)}</article>`;
  },
};
async function loadSupport() {
  const container = document.querySelector("#support-content");
  if (!container) return;
  if (!TM.user) { container.innerHTML = '<div class="empty-state"><h2>Đăng nhập để gửi và theo dõi phản hồi</h2><button class="btn" id="support-login">Đăng nhập</button></div>'; container.querySelector("button").onclick = () => TM.openAuth(); return; }
  container.innerHTML = `<div class="support-grid"><section class="feature-card"><h2>Gửi phản hồi mới</h2><form><label class="form-field">Tiêu đề<input name="subject" maxlength="150" required></label><label class="form-field">Nội dung liên quan<select name="type">${Object.entries(FeedbackUI.types).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")}</select></label><label class="form-field">Điểm đến (nếu có)<select name="destinationId"><option value="">Góp ý chung về website</option></select></label><label class="form-field">Mô tả / nguồn đối chiếu<textarea name="content" maxlength="2000" required rows="5" placeholder="Thông tin cần sửa, thời điểm và nguồn tham khảo..."></textarea></label><p class="field-help">Tối đa 10 phản hồi mỗi giờ. Tránh ghi mật khẩu hoặc thông tin riêng tư.</p><p class="form-error" role="alert"></p><button class="btn" type="submit">Gửi quản trị viên</button></form></section><section><h2>Phản hồi đã gửi</h2><div id="my-feedback"></div><div class="pagination"><button class="btn outline small" id="support-prev">← Trước</button><span id="support-page"></span><button class="btn outline small" id="support-next">Sau →</button></div></section></div>`;
  const userId = TM.user._id, generation = SessionIdle.state?.generation;
  let page = 1;
  const form = container.querySelector("form"), list = container.querySelector("#my-feedback");
  const render = async () => {
    const result = await api.request(`/feedback?page=${page}&limit=5`);
    if (TM.user?._id !== userId || generation !== SessionIdle.state?.generation) return;
    list.innerHTML = result.items.map(i => FeedbackUI.card(i)).join("") || '<p class="day-empty">Chưa có phản hồi. Những góp ý của bạn sẽ xuất hiện tại đây.</p>';
    container.querySelector("#support-page").textContent = `${page} / ${Math.max(1,result.pages)}`;
    container.querySelector("#support-prev").disabled = page <= 1; container.querySelector("#support-next").disabled = page >= result.pages;
  };
  form.onsubmit = async event => {
    event.preventDefault(); const b = form.querySelector("button"); b.disabled = true; form.querySelector(".form-error").textContent = "";
    try { await api.request("/feedback", { method: "POST", body: Object.fromEntries(new FormData(form)) }); form.reset(); page = 1; await render(); TM.toast("Đã gửi phản hồi. Bạn có thể xem trả lời tại trang này."); }
    catch (e) { form.querySelector(".form-error").textContent = e.message; } finally { b.disabled = false; }
  };
  container.querySelector("#support-prev").onclick = () => { page--; render().catch(e => TM.toast(e.message,true)); };
  container.querySelector("#support-next").onclick = () => { page++; render().catch(e => TM.toast(e.message,true)); };
  try {
    await Promise.all([(async () => {
      let page = 1, result;
      const chosen = new URLSearchParams(location.search).get("destination");
      do {
        result = await api.request(`/destinations?limit=100&page=${page}`);
        if (!form.isConnected || TM.user?._id !== userId || generation !== SessionIdle.state?.generation) return;
        form.elements.destinationId.insertAdjacentHTML("beforeend", result.items.map(d => `<option value="${d._id}">${TM.escape(d.name)} · ${TM.escape(d.province)}</option>`).join(""));
        if (result.items.some(d => d._id === chosen)) form.elements.destinationId.value = chosen;
        page++;
      } while (page <= result.pages);
    })(), render()]);
  } catch (e) { TM.toast(e.message,true); }
}
if (document.querySelector("#support-content")) { TM.ready.then(loadSupport); document.addEventListener("authchange", loadSupport); }
