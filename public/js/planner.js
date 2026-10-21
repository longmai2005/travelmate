const dashboard = document.querySelector("#trip-dashboard");
const editor = document.querySelector("#trip-editor");
const tripDialog = document.querySelector("#trip-dialog");
const tripForm = document.querySelector("#trip-form");
let trips = [],
  currentTrip = null,
  dirty = false,
  editingMetadata = false,
  heldDraft = null,
  tripLoadRequest = 0;
const pendingDestination = new URLSearchParams(location.search).get("add");
function makeDates(start, end) {
  const count = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (!Number.isInteger(count) || count < 1 || count > 7)
    throw new Error("Chuyến đi cần kéo dài từ 1 đến 7 ngày.");
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10),
  );
}
const calculateBudget = window.TravelBudget;
function markDirty() {
  dirty = true;
  editor.querySelector("#save-trip").textContent = "Lưu thay đổi";
  editor.querySelector("#save-status").textContent = "Có thay đổi chưa lưu";
}
async function loadTrips() {
  const request = ++tripLoadRequest, generation = SessionIdle.state?.generation;
  if (!TM.user) {
    currentTrip = null;
    dirty = false;
    editor.hidden = true;
    dashboard.hidden = false;
    document.querySelector("#planner-heading").hidden = false;
    TM.empty(
      dashboard,
      "map-pinned",
      "Hành trình riêng đang chờ bạn",
      "Đăng nhập để tạo, lưu và tiếp tục chỉnh sửa lịch trình trên mọi lần truy cập.",
      '<button class="btn" id="planner-login">Đăng nhập để lên lịch</button>',
    );
    document
      .querySelector("#planner-login")
      .addEventListener("click", () => TM.openAuth());
    return;
  }
  dashboard.innerHTML =
    '<div class="loading">Đang mở những hành trình của bạn...</div>';
  try {
    const result = await api.request("/itineraries");
    if (request !== tripLoadRequest || !TM.user || generation !== SessionIdle.state?.generation) return;
    trips = result.items;
    if (heldDraft) {
      if (heldDraft.userId === TM.user._id && trips.some(trip => trip._id === heldDraft.trip._id)) {
        currentTrip = heldDraft.trip;
        currentTrip.permissions = trips.find(trip => trip._id === currentTrip._id).permissions;
        dirty = true;
        dashboard.hidden = true; editor.hidden = false;
        document.querySelector("#planner-heading").hidden = true;
        TM.toast(currentTrip.permissions.canEdit ? "Đã khôi phục thay đổi chưa lưu. Kiểm tra rồi bấm Lưu thay đổi." : "Bản nháp vẫn ở tab này, nhưng quyền đã chuyển sang chỉ xem. Hãy sao chép nội dung cần giữ.");
      }
      heldDraft = null;
    }
    if (currentTrip && !dirty)
      currentTrip = trips.find((t) => t._id === currentTrip._id) || null;
    renderDashboard();
    if (currentTrip) renderEditor();
    else { const id = new URLSearchParams(location.search).get("trip"); if (id && trips.some(t => t._id === id)) openEditor(id); }
  } catch (error) {
    TM.error(dashboard, error);
  }
}
function tripStatus(trip) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return trip.endDate < today
    ? "Đã kết thúc"
    : trip.startDate > today
      ? "Sắp khởi hành"
      : "Đang diễn ra";
}
function renderDashboard() {
  if (!trips.length) {
    TM.empty(
      dashboard,
      "backpack",
      "Điều đáng nhớ bắt đầu từ một kế hoạch",
      "Tạo chuyến đi đầu tiên, thêm nơi bạn muốn đến và để TravelMate giúp bạn sắp xếp.",
      '<button class="btn" id="empty-new-trip"><i data-lucide="plus"></i> Tạo chuyến đi đầu tiên</button>',
    );
    document
      .querySelector("#empty-new-trip")
      .addEventListener("click", () => openTripForm());
    return;
  }
  dashboard.innerHTML = trips
    .map((trip) => {
      const b = calculateBudget(trip);
      const first = trip.days
        .flatMap((d) => d.items)
        .find((i) => i.destinationId?.imageUrl)?.destinationId;
      return `<article class="trip-card"><div class="trip-cover"><img src="${TM.escape(first?.imageUrl || "/images/halong.jpg")}" alt="Ảnh minh họa hành trình" loading="lazy"><span class="badge">${tripStatus(trip)}</span></div><div class="trip-content"><h3>${TM.escape(trip.title)}</h3><p><i data-lucide="calendar-days"></i> ${TM.date(trip.startDate)} – ${TM.date(trip.endDate)}</p><p>${trip.days.length} ngày khám phá · ${trip.travelers} người đồng hành</p><div class="trip-stats"><span>Chi phí ước tính${b.missing ? " (chưa đủ)" : ""}</span><strong>${TM.money(b.total)}</strong></div><div class="trip-actions"><button class="btn light small" data-edit-trip="${trip._id}">${trip.permissions?.canEdit ? "Xem & chỉnh sửa" : "Xem lịch trình"} <i data-lucide="arrow-up-right"></i></button>${trip.permissions?.canManage ? `<button class="btn danger small" data-delete-trip="${trip._id}" aria-label="Xóa ${TM.escape(trip.title)}"><i data-lucide="trash-2"></i></button>` : ""}</div><p class="field-help">${trip.permissions?.role === "owner" ? "Bạn là chủ chuyến đi" : trip.permissions?.canEdit ? "Được mời chỉnh sửa" : "Được mời xem"}</p></div></article>`;
    })
    .join("");
  TM.icons();
}
function openTripForm(edit = false) {
  if (!TM.requireLogin(() => openTripForm(edit))) return;
  editingMetadata = edit;
  tripForm.reset();
  document.querySelector("#trip-form-error").textContent = "";
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  )
    .toISOString()
    .slice(0, 10);
  const values = edit
    ? currentTrip
    : {
        title: "",
        startDate: start,
        endDate: start,
        travelers: 2,
        budgetLimitVnd: 3000000,
        notes: "",
      };
  [
    "title",
    "startDate",
    "endDate",
    "travelers",
    "budgetLimitVnd",
    "notes",
  ].forEach((key) => (tripForm.elements[key].value = values[key]));
  document.querySelector("#trip-dialog-title").textContent = edit
    ? "Chỉnh sửa chuyến đi"
    : "Tạo chuyến đi mới";
  tripForm.querySelector("[type=submit]").textContent = edit
    ? "Áp dụng thay đổi"
    : "Bắt đầu lên lịch";
  tripDialog.showModal();
}
tripForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = tripForm.querySelector("[type=submit]");
  button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(tripForm));
    const dates = makeDates(values.startDate, values.endDate);
    const data = {
      ...values,
      travelers: Number(values.travelers),
      budgetLimitVnd: Number(values.budgetLimitVnd),
    };
    if (editingMetadata) {
      if (data.travelers < (currentTrip.participants?.length || 0)) throw new Error("Hãy giảm số thành viên ghi chi tiêu trước khi giảm số người của chuyến đi.");
      const removed = currentTrip.days.filter(
        (day) => !dates.includes(day.date) && (day.items.length || day.notes),
      );
      if (
        removed.length &&
        !(await TM.confirm(
          "Ngày mới sẽ xóa một số hoạt động",
          `Có ${removed.reduce((n, d) => n + d.items.length, 0)} hoạt động cùng ghi chú ngày nằm ngoài thời gian mới. Bạn có muốn bỏ các hoạt động đó?`,
          "Đổi ngày và bỏ hoạt động",
        ))
      )
        return;
      data.days = dates.map(
        (date) =>
          currentTrip.days.find((day) => day.date === date) || {
            date,
            notes: "",
            items: [],
          },
      );
      if (removed.length) data.confirmDateRemoval = true;
      Object.assign(currentTrip, data);
      markDirty();
      tripDialog.close();
      renderEditor();
    } else {
      data.days = dates.map((date) => ({ date, notes: "", items: [] }));
      const { itinerary } = await api.request("/itineraries", {
        method: "POST",
        body: data,
      });
      trips.unshift(itinerary);
      tripDialog.close();
      openEditor(itinerary._id);
      TM.toast("Đã tạo và lưu chuyến đi mới.");
      if (pendingDestination) {
        await openDestinationPicker(0, pendingDestination);
        history.replaceState(null, "", "/planner");
      }
    }
  } catch (error) {
    document.querySelector("#trip-form-error").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
function openEditor(id) {
  currentTrip = structuredClone(trips.find((t) => t._id === id));
  dirty = false;
  currentTrip.days.forEach((day) =>
    day.items.forEach((item) => {
      if (item.destinationId) TM.cache([item.destinationId]);
    }),
  );
  dashboard.hidden = true;
  editor.hidden = false;
  document.querySelector("#planner-heading").hidden = true;
  renderEditor();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderEditor() {
  const trip = currentTrip,
    e = TM.escape;
  if (!trip) return;
  const b = calculateBudget(trip);
  editor.innerHTML = `<div class="page-heading"><div><div class="breadcrumb"><button class="btn ghost small" id="back-trips"><i data-lucide="arrow-left"></i> Tất cả chuyến đi</button></div><div class="eyebrow">HÀNH TRÌNH CỦA RIÊNG BẠN</div></div></div><div class="editor-top"><div><h2>${e(trip.title)}</h2><p>${TM.date(trip.startDate)} – ${TM.date(trip.endDate)} · ${trip.days.length} ngày · ${trip.travelers} người</p></div><div><button class="btn outline small" id="edit-trip-info"><i data-lucide="settings-2"></i> Thông tin chuyến đi</button></div></div>${trip.notes ? `<p class="status-note">${e(trip.notes)}</p>` : ""}<div class="planner-tools"><button class="btn light small" id="suggest-trip"><i data-lucide="sparkles"></i> Gợi ý lịch trình</button><button class="btn outline small" id="share-trip"><i data-lucide="share-2"></i> Chia sẻ${trip.sharedAt ? " · Đang bật" : ""}</button><button class="btn outline small" id="print-trip"><i data-lucide="printer"></i> In / Lưu PDF</button></div><div class="editor-layout"><div>${trip.days
    .map((day, dayIndex) => {
      const total = calculateBudget({ ...trip, expenses: [], days: [day] });
      return `<section class="day-card"><div class="day-heading"><div class="day-title"><span class="day-number">${String(dayIndex + 1).padStart(2, "0")}</span><div><h3>Ngày ${dayIndex + 1}</h3><small>${TM.date(day.date)}</small></div></div><button class="btn light small" data-add-day="${dayIndex}"><i data-lucide="plus"></i> Thêm điểm đến</button></div>${
        day.items.length
          ? day.items
              .map((item, itemIndex) => {
                const d = item.destinationId;
                const cost =
                  item.customCostPerPersonVnd ?? d?.estimatedCostPerPersonVnd;
                return `<div class="activity"><img src="${e(d?.imageUrl || "/images/placeholder.svg")}" alt="${e(d?.name || "Địa điểm không còn tồn tại")}"><div><h4>${item.visitTime ? `${e(item.visitTime)} · ` : ""}${e(d?.name || "Địa điểm không còn tồn tại")}</h4><p>${e(d?.province || "")}${d && !d.isActive ? " · Đã ngừng hoạt động" : ""} · ${TM.money(cost)}${cost == null ? "" : " / người"}</p>${item.note ? `<p>${e(item.note)}</p>` : ""}</div><div class="activity-tools"><button class="icon-btn" data-edit-item="${dayIndex},${itemIndex}" title="Sửa giờ, chi phí, ghi chú" aria-label="Chỉnh sửa hoạt động"><i data-lucide="pencil"></i></button><button class="icon-btn" data-move-item="${dayIndex},${itemIndex}" title="Chuyển sang ngày khác" aria-label="Chuyển ngày"><i data-lucide="arrow-right-left"></i></button><button class="icon-btn" data-remove-item="${dayIndex},${itemIndex}" title="Bỏ hoạt động" aria-label="Bỏ hoạt động"><i data-lucide="x"></i></button></div></div>`;
              })
              .join("")
          : '<div class="day-empty">Một ngày trống cho những điều mới. Thêm điểm đến đầu tiên nhé!</div>'
      }<div class="day-total">Ước tính ngày ${dayIndex + 1}: <strong>${TM.money(total.total)}</strong>${total.missing ? ` · ${total.missing} hoạt động chưa có giá` : ""}</div><label class="sr-only" for="day-note-${dayIndex}">Ghi chú ngày ${dayIndex + 1}</label><input id="day-note-${dayIndex}" class="day-notes" data-day-note="${dayIndex}" value="${e(day.notes)}" maxlength="500" placeholder="Thêm ghi chú cho ngày này..."></section>`;
    })
    .join(
      "",
    )}<section class="day-card"><div class="day-heading"><div><h3>Các khoản chi bổ sung</h3><p class="field-help">Nhập tổng tiền cho cả chuyến hoặc số tiền mỗi người.</p></div><button class="btn light small" id="add-expense"><i data-lucide="plus"></i> Thêm khoản chi</button></div>${PlannerExtras.expenseList(trip)}</section>${TripGroup.render(trip)}</div><aside class="budget-panel"><div class="eyebrow"><i data-lucide="wallet"></i> CHỦ ĐỘNG KHOẢN CHI</div><h3>Ngân sách chuyến đi</h3><p>Hoạt động tính theo số người; các khoản chi bổ sung theo cách bạn chọn. Giá là ước tính, chưa phải xác nhận đặt dịch vụ.</p><div class="budget-amount">${TM.money(b.total)}</div><p>${b.missing ? "Tạm tính · chưa đầy đủ" : "Tổng chi phí dự kiến"}</p><div class="progress ${b.remaining < 0 ? "over" : ""}" role="progressbar" aria-valuenow="${Math.min(100, b.percent)}" aria-valuemin="0" aria-valuemax="100" aria-label="Tỷ lệ dùng ngân sách"><span style="width:${Math.min(100, b.percent)}%"></span></div><div class="budget-row"><span>Ngân sách đã đặt</span><strong>${TM.money(trip.budgetLimitVnd)}</strong></div><div class="budget-row"><span>${b.remaining < 0 ? "Vượt ngân sách" : "Còn lại"}</span><strong>${TM.money(Math.abs(b.remaining))}</strong></div><div class="budget-row"><span>Đã dùng</span><strong>${b.percent}%</strong></div>${b.remaining < 0 ? '<p class="status-note warning">Chi phí đang vượt ngân sách của bạn.</p>' : ""}${b.missing ? `<p class="status-note warning">${b.missing} hoạt động chưa có giá. Hãy nhập ước tính để hoàn thiện ngân sách.</p>` : ""}${TripView.breakdown(b)}<p class="field-help">Các khoản chưa nhập sẽ chưa được tính vào tổng.</p><hr><p id="save-status">${dirty ? "Có thay đổi chưa lưu" : "Đã lưu lịch trình"}</p><button class="btn" id="save-trip"><i data-lucide="save"></i> ${dirty ? "Lưu thay đổi" : "Lưu lịch trình"}</button><button class="btn outline small" id="delete-current"><i data-lucide="trash-2"></i> Xóa chuyến đi</button></aside></div>`;
  const tools = editor.querySelector(".planner-tools");
  tools.insertAdjacentHTML("beforeend", `<button class="btn outline small" id="team-trip">${trip.permissions?.canManage ? "Cộng tác viên" : "Quyền cộng tác"}</button><button class="btn outline small" id="comments-trip">Trao đổi nhóm</button><button class="btn outline small" id="weather-trip">Thời tiết</button><button class="btn outline small" id="offline-trip">Lưu ngoại tuyến</button><button class="btn ghost small" id="reload-trip">Tải bản mới nhất</button>`);
  if (!trip.permissions?.canManage) editor.querySelectorAll("#delete-current, #share-trip").forEach(el => el.hidden = true);
  if (!trip.permissions?.canEdit) {
    editor.querySelectorAll("#edit-trip-info, #suggest-trip, [data-add-day], .activity-tools, #add-expense, .expense-tools, #save-trip").forEach(el => el.hidden = true);
    editor.querySelectorAll(".day-notes").forEach(el => el.readOnly = true);
    editor.querySelector("#save-status").textContent = "Bạn có quyền chỉ xem lịch trình này.";
  }
  TM.icons();
}
async function saveTrip() {
  const generation = SessionIdle.state?.generation;
  const button = editor.querySelector("#save-trip");
  button.disabled = true;
  try {
    const body = TM.tripBody(currentTrip);
    if (currentTrip.confirmDateRemoval) body.confirmDateRemoval = true;
    const { itinerary } = await api.request(`/itineraries/${currentTrip._id}`, {
      method: "PUT",
      body,
    });
    if (!TM.user || generation !== SessionIdle.state?.generation) return false;
    currentTrip = itinerary;
    trips = trips.map((t) => (t._id === itinerary._id ? itinerary : t));
    dirty = false;
    renderEditor();
    TM.toast("Đã lưu lịch trình.");
    return true;
  } catch (error) {
    TM.toast(error.message, true);
    if (error.status === 409) editor.querySelector("#save-status").textContent = "Bản lưu đã thay đổi. Giữ tab này để tham khảo rồi bấm Tải bản mới nhất khi sẵn sàng.";
    return false;
  } finally {
    button.disabled = false;
  }
}
async function deleteTrip(id) {
  if (
    !(await TM.confirm(
      "Xóa chuyến đi?",
      "Lịch trình và các hoạt động trong chuyến đi này sẽ được xóa khỏi tài khoản của bạn.",
      "Xóa chuyến đi",
    ))
  )
    return;
  try {
    await api.request(`/itineraries/${id}`, { method: "DELETE" });
    trips = trips.filter((t) => t._id !== id);
    currentTrip = null;
    dirty = false;
    editor.hidden = true;
    dashboard.hidden = false;
    document.querySelector("#planner-heading").hidden = false;
    renderDashboard();
    TM.toast("Đã xóa chuyến đi.");
  } catch (error) {
    TM.toast(error.message, true);
  }
}
async function openDestinationPicker(dayIndex, selectedId) {
  try {
    if (selectedId) {
      const { destination } = await api.request(`/destinations/${selectedId}`);
      TM.cache([destination]);
      return editActivity(dayIndex, null, destination);
    }
    const e = TM.escape;
    const dialog = TM.dialog(
      `<div class="modal-body"><div class="modal-heading"><div><h2>Ngày ${dayIndex + 1}, đi đâu nhỉ?</h2><p>Tự chọn từ toàn bộ danh mục, không chỉ các điểm được gợi ý.</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><label class="input-wrap"><i data-lucide="search"></i><span class="sr-only">Tìm điểm đến</span><input id="picker-search" placeholder="Tìm tên điểm đến hoặc địa phương..."></label><div class="picker-filters"><label class="form-field">Tỉnh / thành phố<select id="picker-province"><option value="">Tất cả tỉnh thành</option></select></label><label class="form-field">Trải nghiệm<select id="picker-category">${TM.categoryOptions()}</select></label></div><p class="picker-summary" aria-live="polite"></p><div class="selection-list"></div><div class="picker-paging"><button type="button" class="btn outline small" id="picker-prev">← Trước</button><span id="picker-page"></span><button type="button" class="btn outline small" id="picker-next">Tiếp →</button></div></div>`,
      "", "Chọn điểm đến",
    );
    let page = 1, pages = 0, items = [], requestNumber = 0, province = "";
    const search = dialog.querySelector("#picker-search"), provinceSelect = dialog.querySelector("#picker-province"), categorySelect = dialog.querySelector("#picker-category"), list = dialog.querySelector(".selection-list");
    const load = async () => {
      const request = ++requestNumber;
      const query = new URLSearchParams({ page, limit: 12, q: search.value, province, category: categorySelect.value });
      list.innerHTML = '<p class="field-help">Đang tìm điểm đến...</p>';
      dialog.querySelector("#picker-prev").disabled = true;
      dialog.querySelector("#picker-next").disabled = true;
      try {
        const result = await api.request(`/destinations?${query}`);
        if (request !== requestNumber || !dialog.isConnected) return;
        items = result.items; pages = result.pages;
        TM.cache(items);
        provinceSelect.innerHTML = '<option value="">Tất cả tỉnh thành</option>' + result.provinces.map(p => `<option value="${e(p)}">${e(p)}</option>`).join("");
        provinceSelect.value = province;
        dialog.querySelector(".picker-summary").textContent = `${result.total} điểm đến phù hợp. Bạn có thể đổi bộ lọc và xem các trang tiếp theo.`;
        list.innerHTML = items.length ? items.map(d => `<button type="button" class="selection-item" data-pick="${d._id}"><img src="${e(d.imageUrl)}" alt="" loading="lazy"><span><strong>${e(d.name)}</strong><small>${e(d.province)} · ${TM.categories[d.category]} · ${TM.money(d.estimatedCostPerPersonVnd)}</small></span></button>`).join("") : '<p class="field-help">Chưa có điểm phù hợp. Thử bỏ bớt bộ lọc hoặc tìm từ khóa khác.</p>';
        dialog.querySelector("#picker-page").textContent = `Trang ${page} / ${pages || 1}`;
        dialog.querySelector("#picker-prev").disabled = page <= 1;
        dialog.querySelector("#picker-next").disabled = page >= pages;
      } catch (error) { if (request === requestNumber && dialog.isConnected) TM.error(list, error); }
    };
    search.addEventListener("input", TM.debounce(() => { page = 1; load(); }, 200));
    provinceSelect.addEventListener("change", () => { province = provinceSelect.value; page = 1; load(); });
    categorySelect.addEventListener("change", () => { page = 1; load(); });
    dialog.querySelector("#picker-prev").addEventListener("click", () => { if (page > 1) { page--; load(); } });
    dialog.querySelector("#picker-next").addEventListener("click", () => { if (page < pages) { page++; load(); } });
    list.addEventListener("click", event => {
      const button = event.target.closest("[data-pick]");
      if (!button) return;
      const destination = items.find(d => d._id === button.dataset.pick);
      if (!destination) return;
      if (currentTrip.days[dayIndex].items.some(item => item.destinationId?._id === destination._id)) return TM.toast("Địa điểm đã có trong ngày này.", true);
      dialog.close();
      editActivity(dayIndex, null, destination);
    });
    load();
  } catch (error) { TM.toast(error.message, true); }
}

function editActivity(dayIndex, itemIndex = null, destination = null) {
  const original =
    itemIndex === null ? null : currentTrip.days[dayIndex].items[itemIndex];
  const d = destination || original.destinationId;
  const dialog = TM.dialog(
    `<div class="modal-body"><div class="modal-heading"><div><h2>${TM.escape(d?.name || "Chỉnh sửa hoạt động")}</h2><p>Thêm một chút chi tiết để hành trình dễ dàng hơn.</p></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form><div class="form-grid"><label class="form-field full">Ngày trải nghiệm<select name="day">${currentTrip.days.map((day, i) => `<option value="${i}" ${i === dayIndex ? "selected" : ""}>Ngày ${i + 1} · ${TM.date(day.date)}</option>`).join("")}</select></label><label class="form-field">Giờ ghé thăm<input type="time" name="visitTime" value="${TM.escape(original?.visitTime || "")}"></label><label class="form-field">Ước tính / người (VND)<input type="number" name="cost" min="0" step="1" value="${original?.customCostPerPersonVnd ?? ""}" placeholder="${d?.estimatedCostPerPersonVnd ?? "Chưa có ước tính"}"><span class="field-help">Để trống để dùng giá gợi ý. Nhập 0 nếu thực sự miễn phí.</span></label><label class="form-field full">Ghi chú<textarea name="note" maxlength="500">${TM.escape(original?.note || "")}</textarea></label></div><div class="form-error" role="alert"></div><div class="form-actions"><button class="btn outline" data-close type="button">Hủy</button><button class="btn" type="submit">${original ? "Áp dụng" : "Thêm vào ngày"}</button></div></form></div>`,
    "",
    "Chi tiết hoạt động",
  );
  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const targetIndex = Number(values.day);
    const target = currentTrip.days[targetIndex];
    if (
      target.items.some(
        (item, index) =>
          item.destinationId?._id === d?._id &&
          !(dayIndex === targetIndex && index === itemIndex),
      )
    ) {
      dialog.querySelector(".form-error").textContent =
        "Địa điểm đã có trong ngày được chọn.";
      return;
    }
    const item = {
      destinationId: d,
      visitTime: values.visitTime,
      note: values.note,
      customCostPerPersonVnd: values.cost === "" ? null : Number(values.cost),
      order: target.items.length,
    };
    if (original) currentTrip.days[dayIndex].items.splice(itemIndex, 1);
    if (original && targetIndex === dayIndex)
      target.items.splice(itemIndex, 0, item);
    else target.items.push(item);
    markDirty();
    dialog.close();
    renderEditor();
  });
}
document
  .querySelector("#new-trip")
  .addEventListener("click", () => openTripForm());
dashboard.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-trip]");
  if (edit) openEditor(edit.dataset.editTrip);
  const del = event.target.closest("[data-delete-trip]");
  if (del) deleteTrip(del.dataset.deleteTrip);
});
editor.addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.id === "back-trips") {
    if (
      dirty &&
      !(await TM.confirm(
        "Rời lịch trình?",
        "Bạn có thay đổi chưa lưu. Rời trang sẽ bỏ những thay đổi đó.",
        "Rời lịch trình",
      ))
    )
      return;
    currentTrip = null;
    dirty = false;
    editor.hidden = true;
    dashboard.hidden = false;
    document.querySelector("#planner-heading").hidden = false;
    renderDashboard();
  }
  if (b.id === "edit-trip-info") openTripForm(true);
  if (b.id === "save-trip") saveTrip();
  if (b.id === "delete-current") deleteTrip(currentTrip._id);
  if (b.hasAttribute("data-add-day"))
    openDestinationPicker(Number(b.dataset.addDay));
  if (b.hasAttribute("data-edit-item") || b.hasAttribute("data-move-item")) {
    const [day, index] = (b.dataset.editItem || b.dataset.moveItem)
      .split(",")
      .map(Number);
    editActivity(day, index);
  }
  if (b.hasAttribute("data-remove-item")) {
    const [day, index] = b.dataset.removeItem.split(",").map(Number);
    currentTrip.days[day].items.splice(index, 1);
    markDirty();
    renderEditor();
  }
});
editor.addEventListener("input", (event) => {
  if (event.target.hasAttribute("data-day-note")) {
    currentTrip.days[Number(event.target.dataset.dayNote)].notes =
      event.target.value;
    markDirty();
  }
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document.addEventListener("authchange", loadTrips);
document.addEventListener("tripchange", () => {
  if (!dirty) loadTrips();
});
TM.ready.then(loadTrips);

document.addEventListener("before-session-clear", event => {
  heldDraft = event.detail.reason === "idle" && dirty && currentTrip ? { userId: event.detail.user._id, trip: structuredClone(currentTrip) } : null;
});
