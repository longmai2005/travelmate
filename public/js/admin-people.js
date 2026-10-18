window.AdminPeople = {
  statuses: {
    upcoming: "Sắp khởi hành",
    ongoing: "Trong thời gian đi",
    completed: "Đã qua ngày kết thúc",
  },
  date(value, time = false) {
    if (!value) return "Chưa ghi nhận";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(value));
  },
  initials(name) {
    return TM.escape(
      (name || "?")
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((p) => p[0])
        .join("")
        .toUpperCase(),
    );
  },
  status(trip) {
    return `<span class="badge trip-status-${trip.status}">${this.statuses[trip.status]}</span>`;
  },
  owner(owner) {
    return owner
      ? `<button class="admin-text-button" data-view-user="${owner._id}">${TM.escape(owner.fullName)}</button><small>${TM.escape(owner.email)}</small>`
      : '<span class="field-help">Tài khoản không còn tồn tại</span>';
  },
  tripPreview(t) {
    return `<article class="admin-trip-preview"><span class="admin-preview-icon"><i data-lucide="route"></i></span><div><button class="admin-text-button" data-view-trip="${t._id}">${TM.escape(t.title)}</button><p>${TM.escape(t.owner?.fullName || "Tài khoản không còn tồn tại")} · ${TM.date(t.startDate)} – ${TM.date(t.endDate)}</p></div><span>${this.status(t)}</span><button class="icon-btn" data-view-trip="${t._id}" aria-label="Xem lịch trình ${TM.escape(t.title)}"><i data-lucide="arrow-up-right"></i></button></article>`;
  },
  overview(stats) {
    document.querySelector("#overview-trip-statuses").innerHTML = [
      "upcoming",
      "ongoing",
      "completed",
    ]
      .map(
        (status) =>
          `<a href="#itineraries?status=${status}"><span class="admin-status-dot ${status}"></span><strong>${stats[status]}</strong><span>${this.statuses[status]}</span><i data-lucide="arrow-up-right"></i></a>`,
      )
      .join("");
    const peak = Math.max(
      1,
      ...stats.activity.flatMap((d) => [d.users, d.itineraries]),
    );
    document.querySelector("#admin-activity-chart").innerHTML = stats.activity
      .map(
        (d) =>
          `<div class="admin-chart-day" aria-label="${TM.date(d.date)}: ${d.users} người dùng mới, ${d.itineraries} lịch trình mới"><div class="admin-chart-bars"><div><span>${d.users}</span><i class="users" style="height:${Math.max(3, (d.users / peak) * 105)}px"></i></div><div><span>${d.itineraries}</span><i class="trips" style="height:${Math.max(3, (d.itineraries / peak) * 105)}px"></i></div></div><small>${d.date.slice(8)}/${d.date.slice(5, 7)}</small></div>`,
      )
      .join("");
    document.querySelector("#overview-users").innerHTML = stats.recentUsers
      .length
      ? stats.recentUsers
          .map(
            (u) =>
              `<button class="admin-person-row" data-view-user="${u._id}"><span class="admin-avatar">${this.initials(u.fullName)}</span><span><strong>${TM.escape(u.fullName)}</strong><small>${TM.escape(u.email)}</small></span><time>${this.date(u.createdAt)}</time></button>`,
          )
          .join("")
      : '<p class="admin-empty">Chưa có thành viên đăng ký.</p>';
    document.querySelector("#overview-trips").innerHTML = stats
      .recentItineraries.length
      ? stats.recentItineraries.map((t) => this.tripPreview(t)).join("")
      : '<div class="admin-empty"><i data-lucide="route"></i><p>Chưa có lịch trình nào được lưu.</p><p>Lịch trình do người dùng tạo sẽ xuất hiện tại đây.</p></div>';
    document.querySelector("#overview-popular").innerHTML = stats
      .popularDestinations.length
      ? stats.popularDestinations
          .map(
            (d, i) =>
              `<div class="admin-popular-row"><span>${i + 1}</span><div><strong>${TM.escape(d.name)}</strong><small>${TM.escape(d.province)}</small></div><b>${d.count}<small>lượt thêm</small></b></div>`,
          )
          .join("")
      : '<p class="admin-empty">Chưa có hoạt động trong các lịch trình đã lưu.</p>';
  },
  pagination(prefix, result) {
    document.querySelector(`#${prefix}-page`).textContent =
      `Trang ${result.page} / ${result.pages || 1} · ${result.total} kết quả`;
    document.querySelector(`#${prefix}-prev`).disabled = result.page <= 1;
    document.querySelector(`#${prefix}-next`).disabled =
      !result.pages || result.page >= result.pages;
  },
  users(result, stats) {
    document.querySelector("#users-summary").innerHTML =
      `<span><strong>${result.total}</strong> tài khoản phù hợp</span><span>${stats.users - stats.admins} người dùng · ${stats.admins} quản trị viên · ${stats.lockedUsers} tài khoản tạm khóa</span>`;
    document.querySelector("#users-table").innerHTML = result.items.length
      ? result.items
          .map(
            (u) =>
              `<tr><td><div class="admin-member-cell"><span class="admin-avatar">${this.initials(u.fullName)}</span><div><button class="admin-text-button" data-view-user="${u._id}">${TM.escape(u.fullName)}</button><small>${TM.escape(u.email)}</small></div></div></td><td>${u.role === "admin" ? '<span class="badge">Quản trị viên</span>' : "Người dùng"}</td><td>${this.date(u.createdAt)}</td><td><a class="admin-count-link" href="#itineraries?userId=${u._id}" aria-label="Xem ${u.itineraryCount} lịch trình của ${TM.escape(u.fullName)}">${u.itineraryCount}</a></td><td>${u.favoriteCount}</td><td><span class="badge ${u.isActive ? "" : "gray"}">${u.isActive ? "Hoạt động" : "Đã tạm khóa"}</span></td><td><div class="table-actions"><button class="btn outline small" data-view-user="${u._id}">Hồ sơ</button>${u.role !== "admin" ? `<button class="btn ${u.isActive ? "danger" : "light"} small" data-user-status="${u._id}">${u.isActive ? "Tạm khóa" : "Mở khóa"}</button>` : '<span class="admin-protected"><i data-lucide="shield-check"></i> Được bảo vệ</span>'}</div></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="admin-empty">Không tìm thấy tài khoản phù hợp. Thử bỏ bớt bộ lọc.</td></tr>';
    this.pagination("users", result);
  },
  itineraries(result) {
    document.querySelector("#itineraries-summary").innerHTML =
      `<span><strong>${result.total}</strong> lịch trình phù hợp</span><span>Xem người tạo, lịch từng ngày và chi phí chuyến đi.</span>`;
    document.querySelector("#itineraries-table").innerHTML = result.items.length
      ? result.items
          .map(
            (t) =>
              `<tr><td><button class="admin-text-button" data-view-trip="${t._id}">${TM.escape(t.title)}</button><small>${t.daysCount} ngày · ${t.activitiesCount} hoạt động</small></td><td>${this.owner(t.owner)}</td><td><span class="admin-date-range">${TM.date(t.startDate)}<small>đến ${TM.date(t.endDate)}</small></span></td><td>${t.travelers}</td><td><strong>${TM.money(t.budgetLimitVnd)}</strong><small class="${t.budget.remaining < 0 ? "admin-budget-warning" : ""}">Ước tính: ${TM.money(t.budget.total)}</small>${t.budget.missing ? `<small class="admin-budget-warning">${t.budget.missing} hoạt động chưa có giá</small>` : ""}</td><td>${this.status(t)}</td><td><button class="btn outline small" data-view-trip="${t._id}"><i data-lucide="eye"></i> Xem</button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="admin-empty">Chưa có lịch trình phù hợp. Thử thay đổi người tạo, ngày hoặc từ khóa.</td></tr>';
    this.pagination("itineraries", result);
  },
  async detail(type, id) {
    if (document.querySelector("#admin-detail-dialog")) return;
    const dialog = TM.dialog(
      '<div class="modal-body"><div class="modal-heading"><h2>Đang tải thông tin...</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p class="loading">Đang đọc dữ liệu từ hệ thống...</p></div>',
      "modal-wide admin-dialog",
      type === "users" ? "Hồ sơ người dùng" : "Chi tiết lịch trình",
    );
    dialog.id = "admin-detail-dialog";
    try {
      const result = await api.request(`/admin/${type}/${id}`);
      if (!dialog.isConnected) return;
      dialog.innerHTML =
        type === "users"
          ? this.userDetail(result)
          : this.tripDetail(result.itinerary);
      TM.icons();
      dialog.querySelector("[data-close]").focus();
    } catch (error) {
      if (!dialog.isConnected) return;
      dialog.innerHTML = `<div class="modal-body"><div class="modal-heading"><h2>Chưa tải được thông tin</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p class="form-error" role="alert">${TM.escape(error.message)}</p></div>`;
      TM.icons();
    }
  },
  userDetail({ user: u, recentItineraries }) {
    return `<div class="modal-body"><div class="modal-heading"><div><div class="eyebrow">HỒ SƠ THÀNH VIÊN</div><h2>${TM.escape(u.fullName)}</h2><p>${TM.escape(u.email)}</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><div class="admin-detail-facts"><div><small>Vai trò</small><strong>${u.role === "admin" ? "Quản trị viên" : "Người dùng"}</strong></div><div><small>Trạng thái</small><strong>${u.isActive ? "Đang hoạt động" : "Đã tạm khóa"}</strong></div><div><small>Ngày tham gia</small><strong>${this.date(u.createdAt, true)}</strong></div><div><small>Đăng nhập gần nhất</small><strong>${this.date(u.lastLoginAt, true)}</strong></div><div><small>Lịch trình đã lưu</small><strong>${u.itineraryCount}</strong></div><div><small>Điểm đến yêu thích</small><strong>${u.favoriteCount}</strong></div></div>${!u.isActive ? `<p class="status-note warning"><strong>Tạm khóa từ ${this.date(u.lockedAt, true)}:</strong> ${TM.escape(u.lockReason)}</p>` : ""}<div class="admin-detail-section-heading"><h3>Lịch trình cập nhật gần đây</h3><a class="btn outline small" href="#itineraries?userId=${u._id}" data-close-admin-detail>Xem tất cả ${u.itineraryCount} lịch trình ↗</a></div><div class="admin-dialog-trip-list">${recentItineraries.length ? recentItineraries.map((t) => this.tripPreview(t)).join("") : '<p class="admin-empty">Thành viên này chưa lưu lịch trình nào.</p>'}</div></div>`;
  },
  tripDetail(t) {
    const e = TM.escape;
    return `<div class="modal-body"><div class="modal-heading"><div><div class="eyebrow">LỊCH TRÌNH CỦA NGƯỜI DÙNG</div><h2>${e(t.title)}</h2><p>${t.owner ? `Người tạo: ${e(t.owner.fullName)} · ${e(t.owner.email)}` : "Tài khoản người tạo không còn tồn tại"}</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><div class="admin-detail-trip-top">${this.status(t)}${t.owner ? `<button class="btn ghost small" data-view-user="${t.owner._id}">Xem hồ sơ người tạo ↗</button>` : ""}</div><div class="admin-detail-facts"><div><small>Thời gian</small><strong>${TM.date(t.startDate)} – ${TM.date(t.endDate)}</strong></div><div><small>Quy mô</small><strong>${t.travelers} người · ${t.daysCount} ngày</strong></div><div><small>Ngân sách chuyến đi</small><strong>${TM.money(t.budgetLimitVnd)}</strong></div><div><small>Ước tính hiện có</small><strong>${TM.money(t.budget.total)}</strong></div><div><small>${t.budget.remaining < 0 ? "Vượt ngân sách" : "Ngân sách còn lại"}</small><strong class="${t.budget.remaining < 0 ? "admin-budget-warning" : ""}">${TM.money(Math.abs(t.budget.remaining))}</strong></div><div><small>Cập nhật gần nhất</small><strong>${this.date(t.updatedAt, true)}</strong></div></div>${t.budget.missing ? `<p class="status-note warning">Còn ${t.budget.missing} hoạt động chưa có giá. Tổng hiện có và ngân sách còn lại chưa phản ánh đầy đủ chi phí.</p>` : ""}${t.notes ? `<section class="admin-trip-note"><h3>Ghi chú chuyến đi</h3><p>${e(t.notes)}</p></section>` : ""}<div class="admin-itinerary-days">${t.days
      .map(
        (day, i) =>
          `<section class="admin-itinerary-day"><h3><span>${i + 1}</span>Ngày ${i + 1} · ${TM.date(day.date)}</h3>${day.notes ? `<p class="admin-day-note">${e(day.notes)}</p>` : ""}${
            day.items.length
              ? day.items
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const d = item.destinationId;
                    const cost =
                      item.customCostPerPersonVnd ??
                      d?.estimatedCostPerPersonVnd;
                    return `<article class="admin-itinerary-activity"><time>${e(item.visitTime || "Chưa chọn giờ")}</time><div><strong>${e(d?.name || "Điểm đến không còn tồn tại")}</strong><small>${e(d?.province)}${d?.isActive === false ? " · Đã ngừng hiển thị" : ""}</small>${item.note ? `<p>${e(item.note)}</p>` : ""}</div><div><strong>${TM.money(cost)}</strong><small>/ người${item.customCostPerPersonVnd != null ? " · Giá tùy chỉnh" : ""}</small></div></article>`;
                  })
                  .join("")
              : '<p class="admin-empty">Chưa có hoạt động trong ngày này.</p>'
          }</section>`,
      )
      .join(
        "",
      )}</div>${t.collaborators?.length ? `<section class="admin-trip-note"><h3>Cộng tác viên · ${t.collaborators.length}</h3>${t.collaborators.map(m => `<p>${e(m.user?.fullName || "Tài khoản đã xóa")} · ${e(m.user?.email || "")} · ${m.role === "editor" ? "Chỉnh sửa" : "Chỉ xem"}</p>`).join("")}</section>` : ""}${TripView.breakdown(t.budget)}${TripView.expenses(t)}${TripView.actual(t)}<p class="field-help">Chi phí dựa trên các hoạt động và khoản chi đã nhập, cần đối chiếu trước khi đặt dịch vụ. Trạng thái chỉ dựa trên ngày đi, không xác nhận chuyến đi đã thực hiện.</p></div>`;
  },
  changeStatus(user) {
    if (
      !user ||
      user.role === "admin" ||
      document.querySelector("#admin-status-dialog")
    )
      return;
    const active = !user.isActive;
    const dialog = TM.dialog(
      `<div class="modal-body"><div class="modal-heading"><h2>${active ? "Mở khóa" : "Tạm khóa"} tài khoản?</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p><strong>${TM.escape(user.fullName)}</strong> · ${TM.escape(user.email)}</p><p>${active ? "Thành viên có thể đăng nhập lại bằng mật khẩu hiện tại." : "Thành viên sẽ không thể đăng nhập hoặc tiếp tục dùng phiên cũ. Các lịch trình và yêu thích vẫn được giữ lại."}</p><form>${active ? "" : '<label class="form-field">Lý do tạm khóa<textarea name="reason" required maxlength="500" placeholder="Ghi rõ lý do để tiện hỗ trợ thành viên."></textarea></label>'}<p class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn outline" data-close>Hủy</button><button type="submit" class="btn ${active ? "" : "danger"}">${active ? "Mở khóa" : "Tạm khóa"} tài khoản</button></div></form></div>`,
      "",
      active ? "Mở khóa tài khoản" : "Tạm khóa tài khoản",
    );
    dialog.id = "admin-status-dialog";
    dialog.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await api.request(`/admin/users/${user._id}/status`, {
          method: "PATCH",
          body: {
            isActive: active,
            ...(!active ? { reason: form.elements.reason.value } : {}),
          },
        });
        dialog.close();
        TM.toast(
          active
            ? "Đã mở khóa tài khoản. Thành viên cần đăng nhập lại."
            : "Đã tạm khóa tài khoản và vô hiệu hóa các phiên cũ.",
        );
        loadAdmin(true);
      } catch (error) {
        form.querySelector(".form-error").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  },
};
document.addEventListener("click", (event) => {
  const user = event.target.closest("[data-view-user]"),
    trip = event.target.closest("[data-view-trip]");
  if (user || trip) {
    document.querySelector("#admin-detail-dialog")?.close();
    AdminPeople.detail(
      user ? "users" : "itineraries",
      user ? user.dataset.viewUser : trip.dataset.viewTrip,
    );
  }
  if (event.target.closest("[data-close-admin-detail]"))
    document.querySelector("#admin-detail-dialog")?.close();
  const status = event.target.closest("[data-user-status]");
  if (status)
    AdminPeople.changeStatus(
      adminItems.find((u) => u._id === status.dataset.userStatus),
    );
});
