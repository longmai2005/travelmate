window.AdminActivity = {
  labels: {
    "user.registered": "Đăng ký tài khoản", "user.locked": "Tạm khóa tài khoản", "user.unlocked": "Mở khóa tài khoản",
    "itinerary.created": "Tạo lịch trình", "itinerary.updated": "Cập nhật lịch trình", "itinerary.deleted": "Xóa lịch trình",
    "itinerary.shared": "Bật / đổi liên kết chia sẻ", "itinerary.unshared": "Thu hồi liên kết chia sẻ",
    "destination.created": "Thêm điểm đến", "destination.updated": "Cập nhật điểm đến", "destination.hidden": "Ẩn điểm đến", "destination.restored": "Khôi phục điểm đến",
  },
  render(result) {
    document.querySelector("#activity-total").textContent = result.total;
    document.querySelector("#activity-list").innerHTML = result.items.length ? result.items.map((activity) => {
      const group = activity.action.split(".")[0];
      const canOpen = !["itinerary.deleted", "destination.hidden"].includes(activity.action) && group !== "destination";
      return `<article class="admin-audit-row"><span class="admin-preview-icon"><i data-lucide="${group === "user" ? "user-round" : group === "itinerary" ? "route" : "map-pin"}"></i></span><div><span class="badge">${this.labels[activity.action] || TM.escape(activity.action)}</span><h3>${canOpen ? `<button class="admin-text-button" data-view-${group === "user" ? "user" : "trip"}="${activity.targetId}">${TM.escape(activity.targetLabel)}</button>` : TM.escape(activity.targetLabel)}</h3><p>Thực hiện bởi ${TM.escape(activity.actorName)}</p>${activity.detail ? `<p class="admin-audit-detail">${TM.escape(activity.detail)}</p>` : ""}</div><time>${AdminPeople.date(activity.createdAt, true)}</time></article>`;
    }).join("") : '<div class="admin-empty"><p>Chưa ghi nhận hoạt động phù hợp.</p><p>Nhật ký bắt đầu từ khi phiên bản này được triển khai.</p></div>';
    AdminPeople.pagination("activity", result);
  },
  start() {
    let cursor = null, initialized = false, polling = false, pending = 0;
    const banner = document.querySelector("#admin-new-activity"), toggle = document.querySelector("#admin-auto-refresh"), status = document.querySelector("#admin-live-status");
    const apply = async () => {
      if (document.querySelector(".admin-main").getAttribute("aria-busy") === "true") return;
      if (await loadAdmin(true)) { pending = 0; banner.hidden = true; }
    };
    banner.addEventListener("click", apply);
    const poll = async () => {
      if (polling || !toggle.checked || document.hidden) return;
      polling = true;
      try {
        const result = await api.request(`/admin/activity?limit=1${cursor ? `&after=${cursor}` : ""}`);
        if (initialized && result.total) {
          pending += result.total;
          banner.textContent = `${pending} hoạt động mới · Bấm để cập nhật dữ liệu`;
          banner.hidden = false;
          const editing = document.querySelector("dialog[open]") || document.activeElement?.matches("input, select, textarea") || window.getSelection()?.toString();
          if (!editing) await apply();
          TM.toast(`${result.total} hoạt động mới trên TravelMate.`);
        }
        cursor = result.latestCursor || cursor;
        initialized = true;
        status.textContent = "Đang theo dõi hoạt động";
      } catch (error) {
        status.textContent = "Chưa kết nối được cập nhật tự động";
        if ([401, 403].includes(error.status)) {
          toggle.checked = false;
          location.assign("/");
        }
      } finally { polling = false; }
    };
    toggle.addEventListener("change", () => {
      status.textContent = toggle.checked ? "Đang kết nối..." : "Đã tạm dừng tự cập nhật";
      if (toggle.checked) poll();
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
    poll();
    const timer = setInterval(poll, 30000);
    window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
  },
};
TM.ready.then(() => { if (TM.user?.role === "admin") AdminActivity.start(); });
