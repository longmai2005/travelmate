window.TM = {
  user: null,
  favorites: new Set(),
  destinationCache: new Map(),
  pendingAction: null,
  categories: {
    beach: "Biển & đảo",
    mountain: "Núi & cao nguyên",
    nature: "Thiên nhiên",
    historical: "Di tích",
    cultural: "Văn hóa",
    entertainment: "Vui chơi",
    food: "Ẩm thực & đời sống",
  },
  categoryIcons: {
    beach: "waves",
    mountain: "mountain",
    nature: "trees",
    historical: "landmark",
    cultural: "lamp",
    entertainment: "ferris-wheel",
    food: "utensils",
  },
  icons() {
    window.lucide?.createIcons();
  },
  money(value) {
    return value == null
      ? "Chưa có ước tính"
      : new Intl.NumberFormat("vi-VN").format(value) + " ₫";
  },
  date(value) {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  },
  escape(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  },
  debounce(fn, ms = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  },
  toast(message, error = false) {
    const item = document.createElement("div");
    item.className = `toast${error ? " error" : ""}`;
    item.textContent = message;
    document.querySelector("#toast-stack").append(item);
    setTimeout(() => item.remove(), 5000);
  },
  empty(container, icon, title, message, action = "") {
    container.innerHTML = `<div class="empty-state"><i data-lucide="${icon}"></i><h3>${this.escape(title)}</h3><p>${this.escape(message)}</p>${action}</div>`;
    this.icons();
  },
  error(container, error) {
    container.innerHTML = '<div class="error-inline" role="alert"></div>';
    container.firstElementChild.textContent = error.message;
  },
  categoryOptions(all = "Tất cả trải nghiệm") {
    return (
      `<option value="">${all}</option>` +
      Object.entries(this.categories)
        .map(([key, label]) => `<option value="${key}">${label}</option>`)
        .join("")
    );
  },
  dialog(html, className = "", label = "Hộp thoại") {
    const dialog = document.createElement("dialog");
    dialog.className = className;
    dialog.setAttribute("aria-label", label);
    dialog.innerHTML = html;
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      dialog.dispatchEvent(new Event("cleanup"));
      dialog.remove();
    });
    dialog.showModal();
    this.icons();
    return dialog;
  },
  async confirm(title, message, button = "Xác nhận") {
    return new Promise((resolve) => {
      const dialog = this.dialog(
        `<div class="modal-body"><div class="modal-heading"><h2>${this.escape(title)}</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>${this.escape(message)}</p><div class="form-actions"><button class="btn outline" data-close>Hủy</button><button class="btn danger" id="confirm-action">${this.escape(button)}</button></div></div>`,
        "",
        title,
      );
      let accepted = false;
      dialog.querySelector("#confirm-action").addEventListener("click", () => {
        accepted = true;
        dialog.close();
      });
      dialog.addEventListener("close", () => resolve(accepted));
    });
  },
  requireLogin(action) {
    if (this.user) return true;
    this.pendingAction = action || null;
    this.openAuth();
    return false;
  },
  renderHeader() {
    const page = document.body.dataset.page;
    if (page === "admin" || !document.querySelector("#site-header")) return;
    const links = [
      ["home", "/", "house", "Trang chủ"],
      ["explore", "/explore", "compass", "Khám phá"],
      ["planner", "/planner", "calendar-days", "Lịch trình"],
      ["favorites", "/favorites", "heart", "Yêu thích"],
    ];
    document.querySelector("#site-header").innerHTML =
      `<div class="site-header"><a href="/" class="brand" aria-label="TravelMate – Trang chủ"><img src="/images/logo.svg" alt=""><span>Travel<span>Mate</span></span></a><nav class="nav" aria-label="Điều hướng chính">${links.map(([key, href, icon, label]) => `<a href="${href}" class="${page === key ? "active" : ""}" ${page === key ? 'aria-current="page"' : ""}><i data-lucide="${icon}"></i>${label}</a>`).join("")}</nav><div class="header-actions">${this.user ? `<details class="user-menu"><summary class="btn light"><i data-lucide="circle-user-round"></i> ${this.escape(this.user.fullName.split(" ").slice(-2).join(" "))} <i data-lucide="chevron-down"></i></summary><div class="user-dropdown"><small>${this.escape(this.user.email)}</small>${this.user.role === "admin" ? '<a href="/admin">Quản trị hệ thống</a>' : ""}<a href="/account">Tài khoản của tôi</a><a href="/support">Phản hồi của tôi</a><a href="/offline">Lịch trình ngoại tuyến</a><button class="btn ghost" id="logout-button">Đăng xuất <i data-lucide="log-out"></i></button></div></details>` : '<button class="btn" id="login-button"><i data-lucide="user-round"></i> Đăng nhập <i data-lucide="arrow-up-right"></i></button>'}<button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Mở điều hướng" aria-expanded="false"><i data-lucide="menu"></i></button></div></div>`;
    document.querySelector("#menu-toggle").addEventListener("click", (e) => {
      const open = document.querySelector(".nav").classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", open);
    });
    document
      .querySelector("#login-button")
      ?.addEventListener("click", () => this.openAuth());
    document
      .querySelector("#logout-button")
      ?.addEventListener("click", () => this.logout());
    this.icons();
  },
  async logout() {
    const user = this.user;
    SessionIdle.stop(user);
    document.dispatchEvent(new CustomEvent("before-session-clear", { detail: { user, reason: "logout" } }));
    this.user = null; this.favorites.clear(); this.pendingAction = null;
    this.renderHeader(); this.refreshHearts();
    document.dispatchEvent(new Event("authchange"));
    try { await api.request("/auth/logout", { method: "POST" }); }
    catch { /* Local sign-out stays effective offline; reconnect retries invalidation. */ }
    api.token = null;
    if (document.body.dataset.page === "admin") return location.assign("/");
    this.toast("Đã đăng xuất. Hẹn gặp bạn ở hành trình tiếp theo!");
  },
  renderFooter() {
    if (!document.querySelector("#site-footer")) return;
    document.querySelector("#site-footer").innerHTML =
      `<div class="container"><div class="footer-main"><div><a class="brand" href="/"><img src="/images/logo.svg" alt=""><span>Travel<span>Mate</span></span></a><p>Đi để khám phá. Lên lịch để thảnh thơi.<br>Người bạn nhỏ cho những hành trình lớn trên khắp Việt Nam.</p></div><div class="footer-links"><div><strong>Cùng khám phá</strong><a href="/explore">Điểm đến Việt Nam</a><a href="/planner">Lên lịch trình</a><a href="/favorites">Nơi bạn yêu thích</a></div><div><strong>Về TravelMate</strong><a href="/">Đồ án EM3 · Advanced Web Design</a><a href="/support">Gửi góp ý & phản hồi</a><a href="/image-credits.html">Nguồn ảnh & giấy phép</a><a href="/README.md">Tài liệu dự án</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} TravelMate. Được tạo nên từ niềm yêu Việt Nam.</span><span>Khám phá. Kết nối. Lên đường.</span></div></div>`;
  },
  cache(items) {
    items.forEach((item) => this.destinationCache.set(item._id, item));
  },
  card(destination) {
    this.cache([destination]);
    const d = destination,
      e = this.escape;
    return `<article class="destination-card"><div class="card-image"><img src="${e(d.imageUrl)}" alt="${e(d.name)}${d.imageKind === "place" ? "" : " · ảnh khu vực hoặc minh họa"}" loading="lazy"><span class="card-badge">${this.categories[d.category] || "Khám phá"}</span>${d.imageSourceUrl ? `<a class="card-photo-source" href="${e(d.imageSourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Nguồn ảnh ${e(d.name)}">${e(this.photoLabel(d))} ⓘ</a>` : ""}${d.imageKind === "area" ? '<span class="photo-kind">Ảnh khu vực</span>' : d.imageKind !== "place" ? '<span class="photo-kind">Ảnh minh họa</span>' : ""}<button class="icon-btn favorite-btn ${this.favorites.has(d._id) ? "selected" : ""}" data-favorite="${d._id}" aria-label="Lưu yêu thích ${e(d.name)}" aria-pressed="${this.favorites.has(d._id)}"><i data-lucide="heart"></i></button></div><div class="card-content"><div class="card-location"><i data-lucide="map-pin"></i>${e(d.province)}${!d.isActive ? " · Đã ngừng hoạt động" : ""}</div><h3>${e(d.name)}</h3><p>${e(d.shortDescription)}</p><div class="card-meta"><div class="card-price">${this.money(d.estimatedCostPerPersonVnd)}${d.estimatedCostPerPersonVnd == null ? "" : "<small>/ người</small>"}</div><button class="btn ghost" data-detail="${d._id}">Chi tiết <i data-lucide="arrow-up-right"></i></button></div><div class="card-bottom"><span class="field-help">${e(d.recommendedDurationHours)} giờ trải nghiệm</span>${d.isActive ? `<button class="btn ghost" data-plan="${d._id}"><i data-lucide="plus"></i> Thêm vào lịch</button>` : '<span class="field-help">Chỉ xem lịch sử</span>'}</div></div></article>`;
  },
  renderCards(container, items) {
    container.innerHTML = items.map((item) => this.card(item)).join("");
    this.icons();
  },
  refreshHearts() {
    document.querySelectorAll("[data-favorite]").forEach((button) => {
      const saved = this.favorites.has(button.dataset.favorite);
      button.classList.toggle("selected", saved);
      button.setAttribute("aria-pressed", saved);
      button.title = saved ? "Bỏ lưu yêu thích" : "Lưu yêu thích";
    });
  },
  async loadFavorites() {
    if (!this.user) return [];
    const { items } = await api.request("/favorites");
    this.favorites = new Set(items.map((item) => item._id));
    this.cache(items);
    this.refreshHearts();
    return items;
  },
  async toggleFavorite(id) {
    if (!this.requireLogin(() => this.toggleFavorite(id))) return;
    try {
      const saved = this.favorites.has(id);
      await api.request(saved ? `/favorites/${id}` : "/favorites", {
        method: saved ? "DELETE" : "POST",
        ...(!saved ? { body: { destinationId: id } } : {}),
      });
      if (saved) this.favorites.delete(id);
      else this.favorites.add(id);
      this.refreshHearts();
      document.dispatchEvent(new Event("favoriteschange"));
      this.toast(
        saved ? "Đã bỏ lưu địa điểm." : "Đã thêm vào bộ sưu tập yêu thích.",
      );
    } catch (error) {
      this.toast(error.message, true);
    }
  },
  photoLabel(destination) {
    const year = destination.imageTakenOn?.slice(0, 4);
    if (!year) return "Ảnh · chưa rõ năm";
    return `${Number(year) < new Date().getFullYear() - 5 ? "Ảnh tư liệu" : "Ảnh"} ${year}`;
  },
  mapQuery(destination) {
    // Tọa độ trong danh mục có thể là tâm vịnh/khu vực, không phải lối vào.
    // Tra cứu địa danh để Google hiển thị điểm tham quan và các lối tiếp cận.
    return `${destination.name}, ${destination.province}, Việt Nam`;
  },
  googleMapsUrl(destination, directions = false) {
    const url = new URL(
      directions
        ? "https://www.google.com/maps/dir/"
        : "https://www.google.com/maps/search/",
    );
    url.searchParams.set("api", "1");
    url.searchParams.set(
      directions ? "destination" : "query",
      this.mapQuery(destination),
    );
    return url.href;
  },
  createMap(element, destinations, note) {
    element.classList.add("google-map");
    element.innerHTML = `<label class="google-map-picker">Xem vị trí điểm đến<select aria-label="Chọn điểm đến trên bản đồ"></select></label><p class="google-map-load-status" role="status" hidden></p><iframe class="google-map-frame" title="Google Maps" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><div class="google-map-info"><div><strong></strong><p></p></div><div class="google-map-actions"><a class="btn outline small" target="_blank" rel="noopener noreferrer" data-google-open>Mở Google Maps ↗</a><a class="btn small" target="_blank" rel="noopener noreferrer" data-google-directions>Chỉ đường ↗</a></div></div><div class="google-map-empty" hidden>Chưa có điểm đến để hiển thị. Hãy thử thay đổi bộ lọc.</div>`;
    const picker = element.querySelector("select");
    const frame = element.querySelector("iframe");
    const info = element.querySelector(".google-map-info");
    const loadStatus = element.querySelector(".google-map-load-status");
    let loadTimer;
    let items = [],
      selectedId;
    function focus(id) {
      const d = items.find((item) => item._id === id);
      if (!d) return;
      selectedId = d._id;
      picker.value = selectedId;
      const url = new URL("https://www.google.com/maps");
      url.searchParams.set("q", TM.mapQuery(d));
      url.searchParams.set("z", "14");
      url.searchParams.set("hl", "vi");
      url.searchParams.set("output", "embed");
      if (frame.src !== url.href) {
        clearTimeout(loadTimer);
        loadStatus.hidden = false;
        loadStatus.textContent = "Đang tải Google Maps…";
        frame.src = url.href;
        loadTimer = setTimeout(() => {
          loadStatus.textContent = "Bản đồ đang tải chậm. Bạn có thể bấm Mở Google Maps bên dưới.";
        }, 12000);
      }
      frame.title = `Google Maps – ${d.name}`;
      info.querySelector("strong").textContent = d.name;
      info.querySelector("p").textContent = d.province;
      info.querySelector("[data-google-open]").href = TM.googleMapsUrl(d);
      info.querySelector("[data-google-directions]").href = TM.googleMapsUrl(
        d,
        true,
      );
      if (note)
        note.textContent =
          "Google Maps · Tra cứu từng địa điểm theo tên và tỉnh thành. Với đảo, vịnh hoặc khu rộng, hãy chọn bến tàu/lối vào trước khi chỉ đường.";
    }
    function update(nextItems) {
      items = nextItems;
      picker.innerHTML = items
        .map(
          (d) =>
            `<option value="${TM.escape(d._id)}">${TM.escape(d.name)}</option>`,
        )
        .join("");
      element.querySelector(".google-map-picker").hidden = items.length < 2;
      frame.hidden = info.hidden = !items.length;
      element.querySelector(".google-map-empty").hidden = !!items.length;
      if (items.length)
        focus(
          items.some((d) => d._id === selectedId) ? selectedId : items[0]._id,
        );
      else {
        clearTimeout(loadTimer);
        loadStatus.hidden = true;
        frame.removeAttribute("src");
        if (note)
          note.textContent = "Không có điểm đến phù hợp với bộ lọc hiện tại.";
      }
      return items.length;
    }
    picker.addEventListener("change", () => focus(picker.value));
    frame.addEventListener("load", () => {
      clearTimeout(loadTimer);
      loadStatus.hidden = true;
    });
    frame.addEventListener("error", () => {
      clearTimeout(loadTimer);
      loadStatus.hidden = false;
      loadStatus.textContent = "Chưa tải được bản đồ. Mở Google Maps để xem trực tiếp.";
      if (note)
        note.textContent =
          "Chưa tải được bản đồ. Bạn có thể dùng nút Mở Google Maps để xem vị trí.";
    });
    update(destinations);
    return {
      update,
      focus,
      destroy() {
        clearTimeout(loadTimer);
        element.replaceChildren();
      },
    };
  },
  async showDetail(id, options = {}) {
    try {
      let d = this.destinationCache.get(id);
      if (!d) {
        const result = await api.request(`/destinations/${id}`);
        d = result.destination;
        this.cache([d]);
      }
      const e = this.escape;
      const dialog = this.dialog(
        `<div class="detail-hero"><img class="detail-image" src="${e(d.imageUrl)}" alt="${e(d.name)}${d.imageKind === "place" ? "" : " · ảnh khu vực hoặc minh họa"}"><button class="icon-btn modal-close" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><div class="modal-body"><div class="eyebrow"><i data-lucide="map-pin"></i>${e(d.province)}</div><h2>${e(d.name)}</h2>${d.imageSourceUrl ? `<p class="image-attribution">${d.imageKind === "area" ? "Ảnh khu vực" : "Ảnh"}: ${e(d.imageCredit || "Wikimedia Commons")}${d.imageTakenOn ? ` · Chụp ${d.imageTakenOn.length === 4 ? e(d.imageTakenOn) : TM.date(d.imageTakenOn)}` : " · Chưa rõ ngày chụp"}${d.imageTakenOn && Number(d.imageTakenOn.slice(0, 4)) < new Date().getFullYear() - 5 ? " · Ảnh tư liệu, cảnh quan có thể đã thay đổi" : ""} · <a href="${e(d.imageSourceUrl)}" target="_blank" rel="noopener noreferrer">Nguồn ảnh</a>${d.imageLicenseUrl ? ` · <a href="${e(d.imageLicenseUrl)}" target="_blank" rel="noopener noreferrer">${e(d.imageLicense)}</a>` : ""}</p>` : '<p class="image-attribution">Ảnh minh họa; chưa có ghi công ảnh cho riêng địa điểm này.</p>'}${!d.isActive ? '<p class="status-note warning">Địa điểm đã ngừng hoạt động. Thông tin được giữ lại cho lịch sử chuyến đi.</p>' : ""}<div class="detail-meta"><span><i data-lucide="compass"></i> ${this.categories[d.category]}</span><span><i data-lucide="clock-3"></i> Khoảng ${d.recommendedDurationHours} giờ</span><span><i data-lucide="wallet"></i> ${this.money(d.estimatedCostPerPersonVnd)}${d.estimatedCostPerPersonVnd == null ? "" : " / người"}</span></div><p class="detail-description">${e(d.description)}</p><div class="destination-facts"><p><strong>Địa chỉ:</strong> ${e(d.address || "Chưa bổ sung")}</p><p><strong>Giờ mở cửa:</strong> ${e(d.openingHours || "Cần kiểm tra trước khi đi")}</p><p><strong>Lưu ý chi phí:</strong> ${e(d.priceNote || "Giá tham khảo, cần đối chiếu với đơn vị cung cấp dịch vụ.")}</p>${d.sourceUrl ? `<p><a href="${e(d.sourceUrl)}" target="_blank" rel="noopener noreferrer">Xem nguồn thông tin ↗</a>${d.verifiedOn ? ` · Kiểm tra ngày ${TM.date(d.verifiedOn)}` : " · Chưa ghi ngày kiểm tra"}</p>` : '<p class="field-help">Thông tin chưa có nguồn đối chiếu; vui lòng xác nhận trước khi đặt dịch vụ.</p>'}</div><p class="field-help">${d.latitude == null ? "Chưa có tọa độ xác minh cho điểm đến này." : `Tọa độ tham khảo: ${d.latitude}, ${d.longitude}`}</p><div class="detail-map" id="detail-map"></div><p class="field-help" id="detail-map-note"></p><p><a href="/explore?province=${encodeURIComponent(d.province)}" target="_blank" rel="noopener noreferrer">Khám phá thêm điểm đến tại ${e(d.province)} ↗</a></p><p><a href="/support?destination=${id}">Báo thông tin chưa chính xác →</a></p><div class="detail-actions"><button class="btn outline favorite-btn ${this.favorites.has(id) ? "selected" : ""}" data-favorite="${id}" aria-pressed="${this.favorites.has(id)}"><i data-lucide="heart"></i> Lưu yêu thích</button>${d.isActive && options.allowPlan !== false ? `<button class="btn" id="detail-plan"><i data-lucide="calendar-plus"></i> Thêm vào lịch trình</button>` : ""}</div></div>`,
        "modal-detail",
        d.name,
      );
      let map;
      {
        map = this.createMap(
          dialog.querySelector("#detail-map"),
          [d],
          dialog.querySelector("#detail-map-note"),
        );
      }
      dialog.addEventListener("cleanup", () => map?.destroy());
      dialog.querySelector("#detail-plan")?.addEventListener("click", () => {
        dialog.close();
        this.addToPlan(id);
      });
    } catch (error) {
      this.toast(error.message, true);
    }
  },
  async addToPlan(id) {
    if (!this.requireLogin(() => this.addToPlan(id))) return;
    try {
      const response = await api.request("/itineraries");
      const trips = response.items.filter(trip => trip.permissions?.canEdit);
      if (!trips.length) {
        const go = await this.confirm(
          "Tạo lịch trình đầu tiên",
          "Bạn cần một chuyến đi trước khi thêm địa điểm. Chuyển sang trang lịch trình để tạo nhé?",
          "Tạo lịch trình",
        );
        if (go) location.assign(`/planner?add=${encodeURIComponent(id)}`);
        return;
      }
      const e = this.escape;
      const dialog = this.dialog(
        `<div class="modal-body"><div class="modal-heading"><div><h2>Thêm vào hành trình</h2><p>Chọn chuyến đi và ngày bạn muốn ghé thăm.</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form id="quick-plan"><div class="form-grid"><label class="form-field full">Chuyến đi<select id="quick-trip">${trips.map((t) => `<option value="${t._id}">${e(t.title)}</option>`).join("")}</select></label><label class="form-field full">Ngày trải nghiệm<select id="quick-day"></select></label><label class="form-field">Giờ ghé thăm<input name="visitTime" type="time"></label><label class="form-field">Ước tính / người (VND)<input name="customCost" type="number" min="0" step="1" placeholder="Dùng giá gợi ý"></label><label class="form-field full">Ghi chú<input name="note" maxlength="500" placeholder="Một điều bạn muốn ghi nhớ"></label></div><div class="form-error" role="alert"></div><div class="form-actions"><button class="btn outline" type="button" data-close>Hủy</button><button class="btn" type="submit">Thêm địa điểm</button></div></form></div>`,
        "",
        "Thêm vào lịch trình",
      );
      const select = dialog.querySelector("#quick-trip"),
        daySelect = dialog.querySelector("#quick-day");
      const updateDays = () => {
        const t = trips.find((t) => t._id === select.value);
        daySelect.innerHTML = t.days
          .map(
            (d, i) =>
              `<option value="${i}">Ngày ${i + 1} · ${this.date(d.date)}</option>`,
          )
          .join("");
      };
      select.addEventListener("change", updateDays);
      updateDays();
      dialog.querySelector("form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        try {
          const trip = trips.find((t) => t._id === select.value);
          const dayIndex = Number(daySelect.value);
          if (
            trip.days[dayIndex].items.some(
              (item) => item.destinationId?._id === id,
            )
          )
            throw new Error("Địa điểm đã có trong ngày này.");
          const body = this.tripBody(trip);
          const values = new FormData(form);
          body.days[dayIndex].items.push({
            destinationId: id,
            visitTime: values.get("visitTime"),
            note: values.get("note"),
            customCostPerPersonVnd:
              values.get("customCost") === ""
                ? null
                : Number(values.get("customCost")),
          });
          await api.request(`/itineraries/${trip._id}`, {
            method: "PUT",
            body,
          });
          dialog.close();
          this.toast("Đã thêm địa điểm vào lịch trình.");
          document.dispatchEvent(new Event("tripchange"));
        } catch (error) {
          form.querySelector(".form-error").textContent = error.message;
        } finally {
          button.disabled = false;
        }
      });
    } catch (error) {
      this.toast(error.message, true);
    }
  },
  tripBody(trip) {
    return {
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      budgetLimitVnd: trip.budgetLimitVnd,
      notes: trip.notes,
      version: trip.version,
      participants: trip.participants || [],
      actualExpenses: trip.actualExpenses || [],
      settlements: trip.settlements || [],
      expenses: trip.expenses || [],
      days: trip.days.map((d) => ({
        date: d.date,
        notes: d.notes || "",
        items: d.items.map((item, order) => ({
          ...item,
          destinationId:
            typeof item.destinationId === "string"
              ? item.destinationId
              : item.destinationId?._id,
          order,
        })),
      })),
    };
  },
};
document.addEventListener("click", (event) => {
  const close = event.target.closest("[data-close]");
  if (close) close.closest("dialog")?.close();
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) TM.toggleFavorite(favorite.dataset.favorite);
  const detail = event.target.closest("[data-detail]");
  if (detail) TM.showDetail(detail.dataset.detail);
  const plan = event.target.closest("[data-plan]");
  if (plan) TM.addToPlan(plan.dataset.plan);
});
document.addEventListener(
  "error",
  (event) => {
    if (
      event.target.tagName === "IMG" &&
      !event.target.src.endsWith("/images/placeholder.svg")
    )
      event.target.src = "/images/placeholder.svg";
  },
  true,
);
TM.renderFooter();
TM.icons();
