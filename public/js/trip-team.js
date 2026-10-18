window.TripTeam = {
  async refresh() {
    const { itinerary } = await api.request(`/itineraries/${currentTrip._id}`);
    currentTrip = itinerary; dirty = false;
    trips = trips.map(t => t._id === itinerary._id ? itinerary : t);
    renderEditor();
  },
  async team() {
    if (!await PlannerExtras.ensureSaved()) return;
    if (!currentTrip.permissions.canManage) {
      const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Quyền cộng tác</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Bạn ${currentTrip.permissions.canEdit ? "được sửa lịch trình, ghi chi tiêu và trao đổi trong nhóm" : "có quyền chỉ xem lịch trình, chi tiêu và trao đổi"}. Chủ chuyến đi quản lý lời mời và quyền truy cập.</p><button class="btn danger" id="leave-trip">Rời chuyến đi</button></div>`);
      dialog.querySelector("#leave-trip").onclick = async () => {
        if (!await TM.confirm("Rời chuyến đi?", "Bạn sẽ cần lời mời mới để tham gia lại.", "Rời chuyến đi")) return;
        try { await api.request(`/itineraries/${currentTrip._id}/team/self`, { method: "DELETE" }); dialog.close(); currentTrip = null; editor.hidden = true; dashboard.hidden = false; document.querySelector("#planner-heading").hidden = false; await loadTrips(); }
        catch (e) { TM.toast(e.message, true); }
      };
      return;
    }
    const dialog = TM.dialog('<div class="modal-body"><div class="modal-heading"><h2>Cộng tác viên</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Mời bằng đúng email tài khoản. Người chỉnh sửa được sửa lịch trình, chi tiêu và trao đổi. Người xem chỉ đọc. Tối đa 20 cộng tác viên.</p><form id="invite-form"><div class="form-grid"><label class="form-field">Email<input type="email" name="email" maxlength="254" required></label><label class="form-field">Quyền<select name="role"><option value="viewer">Chỉ xem</option><option value="editor">Chỉnh sửa</option></select></label></div><button class="btn" type="submit">Tạo lời mời</button></form><div id="invite-link"></div><p class="form-error" role="alert"></p><div id="team-members"></div></div>', "modal-wide");
    const error = dialog.querySelector(".form-error"), list = dialog.querySelector("#team-members");
    const render = async () => {
      const result = await api.request(`/itineraries/${currentTrip._id}/team`);
      list.innerHTML = `<h3>Đã tham gia · ${result.members.length}</h3>${result.members.map(m => `<article class="expense-row"><div><strong>${TM.escape(m.user?.fullName || "Tài khoản đã xóa")}</strong><small>${TM.escape(m.user?.email || "")}${m.user?.isActive === false ? " · Đã khóa" : ""}</small></div><select aria-label="Quyền của ${TM.escape(m.user?.fullName || "thành viên")}" data-member-role="${m.userId}"><option value="viewer" ${m.role === "viewer" ? "selected" : ""}>Chỉ xem</option><option value="editor" ${m.role === "editor" ? "selected" : ""}>Chỉnh sửa</option></select><button class="btn danger small" data-member-remove="${m.userId}">Thu hồi</button></article>`).join("") || '<p class="field-help">Chưa có cộng tác viên.</p>'}<h3>Lời mời đang chờ · ${result.invitations.length}</h3>${result.invitations.map(i => `<article class="expense-row"><div><strong>${TM.escape(i.email)}</strong><small>${i.role === "editor" ? "Chỉnh sửa" : "Chỉ xem"} · Hết hạn ${TM.date(i.expiresAt.slice(0, 10))}</small></div><button class="btn outline small" data-invite-revoke="${i._id}">Thu hồi lời mời</button></article>`).join("") || '<p class="field-help">Chưa có lời mời đang chờ.</p>'}`;
    };
    dialog.querySelector("form").onsubmit = async event => {
      event.preventDefault(); const button = event.target.querySelector("button"); button.disabled = true; error.textContent = "";
      try {
        const result = await api.request(`/itineraries/${currentTrip._id}/invitations`, { method: "POST", body: Object.fromEntries(new FormData(event.target)) });
        const url = new URL(result.path, location.origin).href;
        const holder = dialog.querySelector("#invite-link");
        holder.innerHTML = '<p class="status-note">Sao chép và gửi riêng liên kết cho người được mời. Liên kết dùng một lần trong 7 ngày; tạo lại sẽ thu hồi liên kết trước cho cùng email.</p><label class="form-field">Liên kết mời<input readonly></label><button class="btn outline small" type="button">Sao chép lời mời</button>';
        holder.querySelector("input").value = url;
        holder.querySelector("button").onclick = async () => { try { await navigator.clipboard.writeText(url); TM.toast("Đã sao chép lời mời."); } catch { holder.querySelector("input").select(); } };
        await render();
      } catch (e) { error.textContent = e.message; } finally { button.disabled = false; }
    };
    list.onchange = async event => {
      const id = event.target.dataset.memberRole; if (!id) return;
      try { await api.request(`/itineraries/${currentTrip._id}/team/${id}`, { method: "PATCH", body: { role: event.target.value } }); await this.refresh(); await render(); }
      catch (e) { error.textContent = e.message; await render(); }
    };
    list.onclick = async event => {
      const b = event.target.closest("button"); if (!b) return;
      if (!await TM.confirm("Thu hồi quyền truy cập?", "Thành viên hoặc liên kết mời sẽ không còn truy cập chuyến đi.", "Thu hồi")) return;
      b.disabled = true;
      try { await api.request(`/itineraries/${currentTrip._id}/${b.dataset.memberRemove ? "team/" + b.dataset.memberRemove : "invitations/" + b.dataset.inviteRevoke}`, { method: "DELETE" }); await this.refresh(); await render(); }
      catch (e) { error.textContent = e.message; b.disabled = false; }
    };
    await render();
  },
  async comments() {
    const id = currentTrip._id, canEdit = currentTrip.permissions.canEdit, owner = currentTrip.permissions.canManage;
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Trao đổi nhóm</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><p>Ý kiến được lưu ngay. Đề xuất chưa tự thay đổi hoạt động trong lịch trình.</p>${canEdit ? '<form><label class="form-field">Loại trao đổi<select name="kind"><option value="comment">Bình luận</option><option value="suggestion">Đề xuất thay đổi</option></select></label><label class="form-field">Nội dung<textarea name="text" required maxlength="1000"></textarea></label><button class="btn" type="submit">Gửi vào nhóm</button></form>' : '<p class="status-note">Bạn có quyền chỉ xem trao đổi.</p>'}<p class="form-error" role="alert"></p><div id="trip-comments"></div><button class="btn outline small" id="older-comments" hidden>Xem trao đổi cũ hơn</button></div>`, "modal-wide");
    const list = dialog.querySelector("#trip-comments"), error = dialog.querySelector(".form-error"), more = dialog.querySelector("#older-comments"); let cursor;
    const render = async (append = false) => {
      const result = await api.request(`/itineraries/${id}/comments${append && cursor ? `?before=${cursor}` : ""}`);
      if (!append) list.replaceChildren();
      if (!result.items.length && !append) list.innerHTML = '<p class="day-empty">Chưa có trao đổi. Chia sẻ ý tưởng cho chuyến đi nhé.</p>';
      list.insertAdjacentHTML("beforeend", result.items.map(c => `<article class="feedback-card"><strong>${TM.escape(c.authorName)}</strong><small> · ${c.kind === "suggestion" ? "Đề xuất" : "Bình luận"} · ${new Date(c.createdAt).toLocaleString("vi-VN")}</small><p class="preserve-lines">${TM.escape(c.text)}</p>${canEdit && (owner || c.userId === TM.user?._id) ? `<button class="btn ghost small" data-comment-delete="${c._id}">Xóa</button>` : ""}</article>`).join(""));
      cursor = result.nextCursor; more.hidden = !cursor;
    };
    more.onclick = () => render(true).catch(e => error.textContent = e.message);
    dialog.querySelector("form")?.addEventListener("submit", async event => {
      event.preventDefault(); const b = event.target.querySelector("button"); b.disabled = true;
      try { await api.request(`/itineraries/${id}/comments`, { method: "POST", body: Object.fromEntries(new FormData(event.target)) }); event.target.reset(); await render(); }
      catch (e) { error.textContent = e.message; } finally { b.disabled = false; }
    });
    list.onclick = async event => {
      const b = event.target.closest("[data-comment-delete]"); if (!b || !await TM.confirm("Xóa trao đổi?", "Nội dung sẽ được xóa khỏi nhóm.", "Xóa")) return;
      try { await api.request(`/itineraries/${id}/comments/${b.dataset.commentDelete}`, { method: "DELETE" }); await render(); }
      catch (e) { error.textContent = e.message; }
    };
    await render();
  },
  async weather() {
    if (!await PlannerExtras.ensureSaved()) return;
    const dialog = TM.dialog('<div class="modal-body"><div class="modal-heading"><h2>Thời tiết trong chuyến đi</h2><button class="icon-btn" data-close aria-label="Đóng">×</button></div><div id="weather-results" aria-live="polite"><p class="loading">Đang lấy dự báo...</p></div></div>', "modal-wide");
    const result = await api.request(`/itineraries/${currentTrip._id}/weather`);
    if (!dialog.isConnected) return;
    const value = (n, unit) => n == null ? "Chưa có dữ liệu" : `${n}${unit}`;
    dialog.querySelector("#weather-results").innerHTML = `<p>Dự báo tối đa 16 ngày kể từ hôm nay, tại điểm đến đầu tiên của mỗi ngày. Khi thiếu tọa độ, dùng vị trí khu vực và ghi rõ bên dưới.</p><div class="weather-grid">${result.days.map(d => `<article class="feedback-card"><h3>${TM.date(d.date)}</h3>${d.status === "available" ? `<strong>${TM.escape(d.location)}</strong><p>${value(d.minC, "°C")} – ${value(d.maxC, "°C")}</p><p>Khả năng mưa: ${value(d.rainPercent, "%")} · Gió tối đa: ${value(d.windKmh, " km/h")}</p><small>${d.approximate ? "Vị trí khu vực · " : ""}Lấy dữ liệu ${new Date(d.fetchedAt).toLocaleString("vi-VN")}</small>${d.rainPercent >= 60 ? '<p class="status-note">Khả năng mưa cao, nên chuẩn bị áo mưa và phương án trong nhà.</p>' : ""}` : `<p>${({ out_of_range: "Ngày này ngoài khoảng dự báo. Hãy xem lại gần ngày đi.", no_location: "Thêm điểm đến vào ngày này để xem dự báo.", unavailable: "Chưa lấy được dự báo. Bạn có thể thử lại sau." })[d.status]}</p>`}</article>`).join("")}</div><p class="field-help">${TM.escape(result.note)} Nguồn: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (CC BY 4.0).</p>`;
  },
};
document.querySelector("#trip-editor").addEventListener("click", async event => {
  const b = event.target.closest("button"); if (!b) return;
  try {
    if (b.id === "team-trip") await TripTeam.team();
    if (b.id === "comments-trip") await TripTeam.comments();
    if (b.id === "weather-trip") await TripTeam.weather();
    if (b.id === "reload-trip") {
      if (dirty && !await TM.confirm("Tải bản mới nhất?", "Các thay đổi chưa lưu trong tab này sẽ bị bỏ. Hãy sao chép nội dung cần giữ trước khi tiếp tục.", "Tải và bỏ bản nháp")) return;
      await TripTeam.refresh(); TM.toast("Đã tải bản lưu mới nhất.");
    }
    if (b.id === "offline-trip" && await PlannerExtras.ensureSaved()) { await OfflineTrips.save(currentTrip); TM.toast("Đã lưu bản ngoại tuyến. Mở mục Lịch trình ngoại tuyến khi mất mạng."); }
  } catch (e) { TM.toast(e.message, true); }
});
