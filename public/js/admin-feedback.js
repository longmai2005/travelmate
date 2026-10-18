window.AdminFeedback = {
  render(result) {
    document.querySelector("#feedback-total").textContent = result.total;
    document.querySelector("#admin-feedback-list").innerHTML = result.items.map(i => `<article class="feedback-card"><div class="expense-row"><div><strong>${TM.escape(i.userId?.fullName || "Tài khoản đã xóa")}</strong><small>${TM.escape(i.userId?.email || "")}</small></div><button class="btn outline small" data-handle-feedback="${i._id}">Xem & trả lời</button></div>${FeedbackUI.card(i)}</article>`).join("") || '<div class="admin-empty">Chưa có phản hồi phù hợp.</div>';
    AdminPeople.pagination("feedback",result);
  },
  open(id) {
    const item = adminItems.find(i => i._id === id); if (!item) return;
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Xử lý phản hồi</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div>${FeedbackUI.card(item)}<p class="field-help">Kết quả trả lời sẽ hiển thị trong Phản hồi của tôi của thành viên. Nếu cần sửa điểm đến, mở mục Điểm đến để đối chiếu và cập nhật riêng.</p><form><label class="form-field">Trạng thái<select name="status">${Object.entries(FeedbackUI.statuses).map(([v,l]) => `<option value="${v}" ${item.status===v ? "selected" : ""}>${l}</option>`).join("")}</select></label><label class="form-field">Nội dung trả lời<textarea name="reply" required maxlength="1000" rows="4"></textarea></label><p class="form-error" role="alert"></p><div class="form-actions"><button class="btn outline" type="button" data-close>Để sau</button><button class="btn" type="submit">Lưu và trả lời</button></div></form></div>`,"modal-wide");
    dialog.querySelector("form").onsubmit = async event => {
      event.preventDefault(); const form = event.target,b=form.querySelector('[type="submit"]'); b.disabled=true;
      try { await api.request(`/admin/feedback/${id}`,{method:"PATCH",body:{...Object.fromEntries(new FormData(form)),version:item.__v}}); dialog.close(); await loadAdmin(true); TM.toast("Đã cập nhật và gửi trả lời trong website."); }
      catch(e) { form.querySelector(".form-error").textContent=e.message; b.disabled=false; }
    };
  },
};
document.querySelector("#admin-feedback-list").addEventListener("click",event=>{const b=event.target.closest("[data-handle-feedback]");if(b)AdminFeedback.open(b.dataset.handleFeedback);});
