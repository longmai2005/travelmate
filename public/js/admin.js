const adminForm = document.querySelector("#admin-filters");
adminForm.elements.category.innerHTML = TM.categoryOptions();
const peopleForms = {
  feedback: document.querySelector("#feedback-filters"),
  users: document.querySelector("#users-filters"),
  itineraries: document.querySelector("#itineraries-filters"),
  activity: document.querySelector("#activity-filters"),
};
let adminItems = [],
  adminPage = 1,
  adminPages = 1,
  adminRequest = 0,
  statsCache = null,
  activeOwner = "",
  ownerCache = null;
const views = {
  feedback: ["Phản hồi", "Lắng nghe thành viên", "Tiếp nhận góp ý, kiểm tra thông tin và trả lời để người dùng theo dõi kết quả."],
  overview: [
    "Tổng quan",
    "Tổng quan hệ thống",
    "Theo dõi cộng đồng, các hành trình và những hoạt động mới nhất trên TravelMate.",
  ],
  users: [
    "Người dùng",
    "Quản lý người dùng",
    "Hiểu thành viên của bạn, xem các hành trình họ tạo và quản lý trạng thái tài khoản.",
  ],
  itineraries: [
    "Lịch trình",
    "Mọi hành trình, một nơi quản lý",
    "Tra cứu tất cả lịch trình đã lưu, người tạo, lịch từng ngày và ngân sách chuyến đi.",
  ],
  destinations: [
    "Điểm đến",
    "Quản lý điểm đến",
    "Tạo, cập nhật và sắp xếp kho điểm đến cho người khám phá.",
  ],
  activity: ["Nhật ký hoạt động", "Mọi thay đổi đều có dấu vết", "Theo dõi đăng ký, cập nhật lịch trình và thao tác quản trị trong 90 ngày gần nhất."],
  hidden: [
    "Điểm đến đã ẩn",
    "Điểm đến đã tạm ẩn",
    "Xem lại những điểm đến đang ngừng hiển thị và khôi phục khi sẵn sàng.",
  ],
};
let currentView = "overview";
const adminMobile = window.matchMedia("(max-width: 768px)");
function setSidebar(open) {
  open = open && adminMobile.matches;
  document.querySelector("#admin-sidebar").inert = adminMobile.matches && !open;
  document.body.classList.toggle("admin-menu-open", open);
  document
    .querySelector("#admin-menu-toggle")
    .setAttribute("aria-expanded", open);
  document.querySelector("#admin-backdrop").hidden = !open;
}
function currentForm() {
  return peopleForms[currentView] || adminForm;
}
function syncAdminHash() {
  if (currentView === "overview") return;
  const params = new URLSearchParams(new FormData(currentForm()));
  [...params.keys()].forEach((key) => {
    if (!params.get(key)) params.delete(key);
  });
  if (currentView === "itineraries" && activeOwner)
    params.set("userId", activeOwner);
  if (adminPage > 1) params.set("page", adminPage);
  history.replaceState(
    null,
    "",
    `#${currentView}${params.size ? `?${params}` : ""}`,
  );
}
function renderView() {
  let [hash, query = ""] = location.hash.slice(1).split("?");
  if (["map-source", "quality"].includes(hash)) {
    hash = "users";
    query = "";
    history.replaceState(null, "", "#users");
  }
  currentView = Object.hasOwn(views, hash) ? hash : "overview";
  statsCache = null;
  const params = new URLSearchParams(query);
  adminRequest++;
  adminPage = Math.max(
    1,
    Math.min(10000, parseInt(params.get("page"), 10) || 1),
  );
  adminForm.reset();
  Object.values(peopleForms).forEach((form) => form.reset());
  const form = currentForm();
  [...form.elements].forEach((field) => {
    if (field.name && params.has(field.name))
      field.value = params.get(field.name);
  });
  activeOwner = currentView === "itineraries" ? params.get("userId") || "" : "";
  if (currentView === "hidden") adminForm.elements.status.value = "inactive";
  adminForm.elements.status.disabled = currentView === "hidden";
  const [label, title, description] = views[currentView];
  document.querySelector("#admin-breadcrumb").textContent = label;
  document.querySelector("#admin-title").textContent = title;
  document.querySelector("#admin-description").textContent = description;
  document.title = `${label} · Quản trị TravelMate`;
  document.querySelectorAll("[data-admin-view]").forEach((link) => {
    const selected = link.dataset.adminView === currentView;
    link.classList.toggle("active", selected);
    if (selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  ["overview", "users", "itineraries", "destinations", "activity", "feedback"].forEach((view) => {
    document.querySelector(`#admin-${view}`).hidden =
      view === "destinations"
        ? !["destinations", "hidden"].includes(currentView)
        : view !== currentView;
  });
  document.querySelector("#add-destination").hidden = ![
    "destinations",
    "hidden",
  ].includes(currentView);
  document.querySelector("#admin-load-error").hidden = true;
  document.querySelector("#itinerary-owner-filter").hidden = !activeOwner;
  setSidebar(false);
  if (TM.user?.role === "admin") loadAdmin();
}
function renderStats(stats) {
  const labels = [
    ["pendingFeedback", "message-square-text", "Phản hồi cần xử lý", "feedback"],
    ["users", "users-round", "Tài khoản đăng ký", "users"],
    ["itineraries", "route", "Lịch trình đã lưu", "itineraries"],
    [
      "upcoming",
      "calendar-clock",
      "Sắp khởi hành",
      "itineraries?status=upcoming",
    ],
    [
      "active",
      "map-pinned",
      "Điểm đến đang hiển thị",
      "destinations?status=active",
    ],
    [
      "lockedUsers",
      "lock-keyhole",
      "Tài khoản tạm khóa",
      "users?status=locked",
    ],
  ];
  document.querySelector("#admin-stats").innerHTML = labels
    .map(
      ([key, icon, label, href]) =>
        `<a class="admin-stat" href="#${href}"><div class="admin-stat-top"><span class="admin-stat-icon"><i data-lucide="${icon}"></i></span><i data-lucide="arrow-up-right"></i></div><strong>${stats[key]}</strong><span class="admin-stat-label">${label}</span></a>`,
    )
    .join("");
  document.querySelectorAll("[data-admin-pending-feedback]").forEach(el => el.textContent = stats.pendingFeedback);
  ["total", "active", "inactive", "users", "itineraries"].forEach((key) =>
    document
      .querySelectorAll(`[data-admin-${key}]`)
      .forEach((el) => (el.textContent = stats[key])),
  );
}
function renderDestinations(result) {
  document.querySelector("#admin-result-total").textContent = result.total;
  document.querySelector("#admin-table").innerHTML = result.items.length
    ? result.items
        .map(
          (d) =>
            `<tr><td><div class="table-destination"><img src="${TM.escape(d.imageUrl)}" alt=""><span><strong>${TM.escape(d.name)}</strong><small>${d.isFeatured ? "✦ Điểm đến nổi bật · " : ""}${d.verifiedOn ? `Kiểm tra ${TM.date(d.verifiedOn)}` : "Chưa đối chiếu nguồn"}</small></span></div></td><td>${TM.escape(d.province)}</td><td>${TM.categories[d.category]}</td><td>${TM.money(d.estimatedCostPerPersonVnd)}</td><td><span class="badge ${d.isActive ? "" : "gray"}">${d.isActive ? "Hoạt động" : "Đã ẩn"}</span></td><td><div class="table-actions"><button class="btn outline small" data-admin-edit="${d._id}"><i data-lucide="pencil"></i> Sửa</button><button class="btn ${d.isActive ? "danger" : "light"} small" data-admin-status="${d._id}">${d.isActive ? "Ẩn" : "Khôi phục"}</button></div></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6" class="admin-empty">Chưa có điểm đến phù hợp với bộ lọc.</td></tr>';
  document.querySelector("#admin-page").textContent =
    `Trang ${adminPage} / ${adminPages || 1}`;
  document.querySelector("#admin-prev").disabled = adminPage <= 1;
  document.querySelector("#admin-next").disabled =
    !adminPages || adminPage >= adminPages;
}
async function loadAdmin(refreshStats = false) {
  if (TM.user?.role !== "admin") return;
  if (refreshStats) statsCache = null;
  const request = ++adminRequest;
  const view = currentView;
  document.querySelector("#admin-last-updated").textContent =
    "Đang cập nhật dữ liệu...";
  document.querySelector("#admin-refresh").disabled = true;
  document.querySelector(".admin-main").setAttribute("aria-busy", "true");
  try {
    const params = new URLSearchParams(new FormData(currentForm()));
    if (view === "hidden") params.set("status", "inactive");
    if (["hidden", "destinations"].includes(view))
      params.set("sort", "updated");
    if (view === "itineraries" && activeOwner)
      params.set("userId", activeOwner);
    params.set("page", adminPage);
    params.set("limit", "10");
    const endpoint = ["users", "itineraries", "activity", "feedback"].includes(view)
      ? view
      : "destinations";
    const [stats, result, owner] = await Promise.all([
      !statsCache || refreshStats || view === "overview"
        ? api.request("/admin/stats")
        : Promise.resolve(statsCache),
      view === "overview"
        ? Promise.resolve(null)
        : api.request(`/admin/${endpoint}?${params}`),
      activeOwner
        ? ownerCache?._id === activeOwner
          ? Promise.resolve(ownerCache)
          : api.request(`/admin/users/${activeOwner}`).then((r) => r.user)
        : Promise.resolve(null),
    ]);
    if (request !== adminRequest) return;
    statsCache = stats;
    renderStats(stats);
    if (view === "overview") AdminPeople.overview(stats);
    else {
      adminItems = result.items;
      adminPages = result.pages;
      if (adminPage > Math.max(1, adminPages)) {
        adminPage = Math.max(1, adminPages);
        syncAdminHash();
        return loadAdmin();
      }
      if (view === "feedback") AdminFeedback.render(result);
      else if (view === "activity") AdminActivity.render(result);
      else if (view === "users") AdminPeople.users(result, stats);
      else if (view === "itineraries") {
        AdminPeople.itineraries(result);
        if (owner) {
          ownerCache = owner;
          document.querySelector("#itinerary-owner-filter span").textContent =
            `Lịch trình của ${owner.fullName} · ${owner.email}`;
        }
      } else renderDestinations(result);
    }
    document.querySelector("#admin-load-error").hidden = true;
    document.querySelector("#admin-last-updated").textContent =
      `Cập nhật lúc ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}`;
    TM.icons();
    return true;
  } catch (error) {
    if (request !== adminRequest) return;
    if ([401, 403].includes(error.status)) return location.assign("/");
    const message = document.querySelector("#admin-load-error");
    message.textContent = error.message;
    message.hidden = false;
    document.querySelector("#admin-last-updated").textContent =
      "Chưa cập nhật được dữ liệu";
    return false;
  } finally {
    if (request === adminRequest) {
      document.querySelector("#admin-refresh").disabled = false;
      document.querySelector(".admin-main").setAttribute("aria-busy", "false");
    }
  }
}

function openDestinationForm(destination) {
  const d = destination || {
    name: "",
    province: "",
    region: "central",
    category: "nature",
    shortDescription: "",
    description: "",
    imageUrl: "",
    estimatedCostPerPersonVnd: null,
    recommendedDurationHours: 2,
    latitude: null,
    longitude: null,
    tags: [],
    isFeatured: false,
    isActive: true,
  };
  const e = TM.escape;
  const dialog = TM.dialog(
    `<div class="modal-body"><div class="modal-heading"><div><div class="eyebrow">ĐIỂM ĐẾN TRAVELMATE</div><h2>${destination ? "Chỉnh sửa" : "Thêm"} địa điểm</h2></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form><div class="form-grid"><label class="form-field full">Tên địa điểm<input name="name" required maxlength="160" value="${e(d.name)}"></label><label class="form-field">Tỉnh / thành phố<input name="province" required maxlength="100" value="${e(d.province)}"></label><label class="form-field">Vùng miền<select name="region"><option value="north">Miền Bắc</option><option value="central">Miền Trung</option><option value="south">Miền Nam</option></select></label><label class="form-field">Trải nghiệm<select name="category">${Object.entries(
      TM.categories,
    )
      .map(([key, label]) => `<option value="${key}">${label}</option>`)
      .join(
        "",
      )}</select></label><label class="form-field">Ước tính / người (VND)<input name="estimatedCostPerPersonVnd" type="number" min="0" step="1" value="${d.estimatedCostPerPersonVnd ?? ""}" placeholder="Để trống nếu chưa rõ"></label><label class="form-field full">Mô tả ngắn<textarea name="shortDescription" required maxlength="300">${e(d.shortDescription)}</textarea></label><label class="form-field full">Mô tả chi tiết<textarea name="description" required maxlength="5000">${e(d.description)}</textarea></label><label class="form-field full">URL ảnh<input name="imageUrl" required value="${e(d.imageUrl)}" placeholder="https://... hoặc /images/..."></label><label class="form-field">Thời lượng gợi ý (giờ)<input name="recommendedDurationHours" type="number" min="0.25" max="168" step="0.25" required value="${d.recommendedDurationHours}"></label><label class="form-field">Tags (phân cách bằng dấu phẩy)<input name="tags" value="${e(d.tags.join(", "))}"></label><label class="form-field">Vĩ độ<input name="latitude" type="number" min="-90" max="90" step="any" value="${d.latitude ?? ""}"></label><label class="form-field">Kinh độ<input name="longitude" type="number" min="-180" max="180" step="any" value="${d.longitude ?? ""}"></label><label class="form-field full">Địa chỉ<input name="address" maxlength="300" value="${e(d.address || "")}" placeholder="Địa chỉ hoặc hướng dẫn tìm vị trí"></label><label class="form-field full">Giờ mở cửa<input name="openingHours" maxlength="300" value="${e(d.openingHours || "")}" placeholder="Để trống nếu chưa kiểm tra"></label><label class="form-field full">Lưu ý giá<textarea name="priceNote" maxlength="500" placeholder="Đối tượng áp dụng, dịch vụ bao gồm, thời điểm giá...">${e(d.priceNote || "")}</textarea></label><label class="form-field full">Nguồn thông tin<input name="sourceUrl" type="url" maxlength="2000" value="${e(d.sourceUrl || "")}" placeholder="https://... ưu tiên nguồn chính thức"></label><label class="form-field">Ngày đã kiểm tra<input name="verifiedOn" type="date" value="${e(d.verifiedOn || "")}"></label><label class="form-field"><span><input name="isFeatured" type="checkbox" ${d.isFeatured ? "checked" : ""}> Địa điểm nổi bật</span></label><label class="form-field"><span><input name="isActive" type="checkbox" ${d.isActive ? "checked" : ""}> Đang hoạt động</span></label></div><p class="field-help">Chỉ nhập tọa độ đã xác minh. Không có dữ liệu thì để trống cả hai trường.</p><div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn outline" data-close>Hủy</button><button type="submit" class="btn">Lưu địa điểm</button></div></form></div>`,
    "modal-wide",
    "Quản lý địa điểm",
  );
  const form = dialog.querySelector("form");
  form.elements.imageUrl.closest("label").insertAdjacentHTML("afterend", `<label class="form-field">Loại ảnh<select name="imageKind"><option value="place">Ảnh địa điểm</option><option value="area">Ảnh khu vực</option><option value="illustration">Ảnh minh họa</option></select></label><label class="form-field">Tác giả ảnh<input name="imageCredit" maxlength="500" value="${e(d.imageCredit || "")}"></label><label class="form-field full">Trang nguồn ảnh<input type="url" name="imageSourceUrl" maxlength="2000" value="${e(d.imageSourceUrl || "")}" placeholder="Trang chứa tên tác giả và giấy phép"></label><label class="form-field">Giấy phép ảnh<input name="imageLicense" maxlength="100" value="${e(d.imageLicense || "")}" placeholder="Ví dụ: CC BY-SA 4.0"></label><label class="form-field">Liên kết giấy phép<input type="url" name="imageLicenseUrl" maxlength="2000" value="${e(d.imageLicenseUrl || "")}"></label>`);
  form.elements.imageKind.value = d.imageKind || "illustration";
  form.elements.imageUrl.addEventListener("change", () => {
    if (form.elements.imageUrl.value === d.imageUrl) return;
    for (const key of ["imageCredit", "imageSourceUrl", "imageLicense", "imageLicenseUrl"]) form.elements[key].value = "";
    form.elements.imageKind.value = "illustration";
    TM.toast("Đã đổi ảnh. Hãy bổ sung nguồn, tác giả và loại ảnh cho ảnh mới.");
  });
  form.elements.region.value = d.region;
  form.elements.category.value = d.category;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(form));
      ["estimatedCostPerPersonVnd", "latitude", "longitude"].forEach(
        (key) => (body[key] = body[key] === "" ? null : Number(body[key])),
      );
      body.recommendedDurationHours = Number(body.recommendedDurationHours);
      body.tags = body.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      body.isFeatured = form.elements.isFeatured.checked;
      body.isActive = form.elements.isActive.checked;
      await api.request(
        destination ? `/admin/destinations/${d._id}` : "/admin/destinations",
        { method: destination ? "PUT" : "POST", body },
      );
      dialog.close();
      TM.toast("Đã lưu thông tin địa điểm.");
      loadAdmin(true);
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

document
  .querySelector("#add-destination")
  .addEventListener("click", () => openDestinationForm());
adminForm.addEventListener("submit", (event) => event.preventDefault());
adminForm.elements.q.addEventListener(
  "input",
  TM.debounce(() => {
    adminPage = 1;
    syncAdminHash();
    loadAdmin();
  }),
);
adminForm.addEventListener("change", () => {
  adminPage = 1;
  syncAdminHash();
  loadAdmin();
});
document.querySelector("#admin-prev").addEventListener("click", () => {
  if (adminPage <= 1) return;
  adminPage--;
  syncAdminHash();
  loadAdmin();
});
document.querySelector("#admin-next").addEventListener("click", () => {
  if (adminPage >= adminPages) return;
  adminPage++;
  syncAdminHash();
  loadAdmin();
});
document
  .querySelector(".admin-main")
  .addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-admin-edit]");
    if (edit)
      openDestinationForm(
        adminItems.find((d) => d._id === edit.dataset.adminEdit),
      );
    const status = event.target.closest("[data-admin-status]");
    if (!status) return;
    const d = adminItems.find((d) => d._id === status.dataset.adminStatus);
    if (!d) return;
    if (
      d.isActive &&
      !(await TM.confirm(
        "Ẩn địa điểm?",
        `${d.name} sẽ biến mất khỏi tìm kiếm công khai. Lịch trình đã lưu vẫn giữ thông tin. Bạn có thể khôi phục sau.`,
        "Ẩn địa điểm",
      ))
    )
      return;
    try {
      await api.request(
        `/admin/destinations/${d._id}${d.isActive ? "" : "/restore"}`,
        { method: d.isActive ? "DELETE" : "PATCH" },
      );
      TM.toast(d.isActive ? "Đã ẩn địa điểm." : "Đã khôi phục địa điểm.");
      loadAdmin(true);
    } catch (error) {
      TM.toast(error.message, true);
    }
  });
document
  .querySelectorAll("[data-create-destination]")
  .forEach((button) =>
    button.addEventListener("click", () => openDestinationForm()),
  );
document.querySelector("#admin-reset").addEventListener("click", () => {
  adminForm.reset();
  if (currentView === "hidden") adminForm.elements.status.value = "inactive";
  adminPage = 1;
  syncAdminHash();
  loadAdmin();
});
document
  .querySelector("#admin-logout")
  .addEventListener("click", () => TM.logout());
document
  .querySelector("#admin-menu-toggle")
  .addEventListener("click", () =>
    setSidebar(!document.body.classList.contains("admin-menu-open")),
  );
document
  .querySelector("#admin-backdrop")
  .addEventListener("click", () => setSidebar(false));
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    document.body.classList.contains("admin-menu-open")
  ) {
    setSidebar(false);
    document.querySelector("#admin-menu-toggle").focus();
  }
});
adminMobile.addEventListener("change", () => setSidebar(false));
window.addEventListener("hashchange", renderView);
renderView();
TM.ready.then(() => {
  if (TM.user?.role !== "admin") return location.assign("/");
  document.querySelector("#admin-user-name").textContent = TM.user.fullName;
  document.querySelector("#admin-avatar").textContent = TM.user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  loadAdmin();
});

document
  .querySelector("#admin-refresh")
  .addEventListener("click", () => loadAdmin(true));
document.querySelector("#clear-owner-filter").addEventListener("click", () => {
  location.hash = "itineraries";
});
Object.entries(peopleForms).forEach(([view, form]) => {
  const refresh = () => {
    adminPage = 1;
    syncAdminHash();
    loadAdmin();
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    refresh();
  });
  form.elements.q?.addEventListener("input", TM.debounce(refresh));
  form.addEventListener("change", refresh);
  document
    .querySelector(`[data-reset-admin="${view}"]`)
    .addEventListener("click", () => {
      form.reset();
      refresh();
    });
  document.querySelector(`#${view}-prev`).addEventListener("click", () => {
    if (adminPage > 1) {
      adminPage--;
      syncAdminHash();
      loadAdmin();
    }
  });
  document.querySelector(`#${view}-next`).addEventListener("click", () => {
    if (adminPage < adminPages) {
      adminPage++;
      syncAdminHash();
      loadAdmin();
    }
  });
});
