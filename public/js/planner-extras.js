window.PlannerExtras = {
  expenseList(trip) {
    return trip.expenses?.length ? trip.expenses.map((expense, index) => `<article class="expense-row"><div><strong>${TM.escape(expense.label)}</strong><small>${TripView.labels[expense.category]} · ${expense.scope === "person" ? `${TM.money(expense.amountVnd)} / người × ${trip.travelers}` : "Cho cả chuyến đi"}</small></div><strong>${TM.money(expense.amountVnd * (expense.scope === "person" ? trip.travelers : 1))}</strong><div class="expense-tools"><button class="icon-btn" data-edit-expense="${index}" aria-label="Sửa khoản chi ${TM.escape(expense.label)}"><i data-lucide="pencil"></i></button><button class="icon-btn" data-remove-expense="${index}" aria-label="Xóa khoản chi ${TM.escape(expense.label)}"><i data-lucide="trash-2"></i></button></div></article>`).join("") : '<p class="day-empty">Thêm khách sạn, vé xe, ăn uống và các khoản dự phòng cho chuyến đi.</p>';
  },
  editExpense(index = null) {
    const expense = index === null ? { label: "", category: "accommodation", amountVnd: "", scope: "trip" } : currentTrip.expenses[index];
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>${index === null ? "Thêm" : "Sửa"} khoản chi</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form><div class="form-grid"><label class="form-field full">Tên khoản chi<input name="label" required maxlength="120" value="${TM.escape(expense.label)}" placeholder="Ví dụ: Khách sạn 2 đêm"></label><label class="form-field">Nhóm chi phí<select name="category">${Object.entries(TripView.labels).filter(([key]) => key !== "activities").map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></label><label class="form-field">Cách tính<select name="scope"><option value="trip">Cho cả chuyến đi</option><option value="person">Mỗi người / cả chuyến</option></select></label><label class="form-field full">Số tiền (VND)<input name="amountVnd" type="number" required min="0" max="1000000000" step="1" value="${expense.amountVnd}"></label></div><p class="field-help">Nếu chọn mỗi người, số tiền được nhân với số người của chuyến đi. Hãy nhập tổng cho toàn bộ số ngày.</p><div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn outline" data-close>Hủy</button><button type="submit" class="btn">Áp dụng khoản chi</button></div></form></div>`, "", "Khoản chi chuyến đi");
    const form = dialog.querySelector("form");
    form.elements.category.value = expense.category;
    form.elements.scope.value = expense.scope;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.amountVnd = Number(data.amountVnd);
      currentTrip.expenses ||= [];
      if (index === null && currentTrip.expenses.length >= 100) {
        form.querySelector(".form-error").textContent = "Tối đa 100 khoản chi trong một chuyến đi.";
        return;
      }
      if (index === null) currentTrip.expenses.push(data);
      else currentTrip.expenses[index] = data;
      markDirty();
      dialog.close();
      renderEditor();
    });
  },
  async ensureSaved() {
    if (!dirty) return true;
    if (!await TM.confirm("Lưu lịch trình trước?", "Chia sẻ và bản in dùng phiên bản đã lưu. Lưu thay đổi hiện tại trước khi tiếp tục?", "Lưu và tiếp tục")) return false;
    return saveTrip();
  },
  async share() {
    if (!await this.ensureSaved()) return;
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Chia sẻ hành trình</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>Bất kỳ ai có liên kết đều có thể xem các hoạt động, ghi chú và ngân sách đã lưu. Email và thông tin tài khoản không được hiển thị. Hãy bỏ thông tin riêng tư trong ghi chú trước khi chia sẻ.</p><p id="share-state" class="status-note">${currentTrip.sharedAt ? "Đang bật chia sẻ. Tạo liên kết mới sẽ vô hiệu hóa liên kết cũ." : "Chuyến đi đang riêng tư."}</p><div id="share-result" hidden><label class="form-field">Liên kết chỉ xem<input class="share-link-input" readonly aria-label="Liên kết chia sẻ"></label><div class="form-actions"><button class="btn outline small" id="copy-share">Sao chép liên kết</button><a class="btn light small" id="open-share" target="_blank" rel="noopener noreferrer">Mở bản chia sẻ ↗</a></div></div><p class="form-error" role="alert"></p><div class="form-actions"><button class="btn outline" id="revoke-share" ${currentTrip.sharedAt ? "" : "disabled"}>Thu hồi liên kết</button><button class="btn" id="create-share">${currentTrip.sharedAt ? "Tạo liên kết mới" : "Bật chia sẻ"}</button></div></div>`, "", "Quản lý chia sẻ");
    const create = dialog.querySelector("#create-share"), revoke = dialog.querySelector("#revoke-share"), error = dialog.querySelector(".form-error");
    const setState = (sharedAt, version) => {
      currentTrip.version = version;
      currentTrip.sharedAt = sharedAt;
      const saved = trips.find((trip) => trip._id === currentTrip._id);
      if (saved) { saved.sharedAt = sharedAt; saved.version = version; }
      renderEditor();
    };
    create.addEventListener("click", async () => {
      create.disabled = revoke.disabled = true;
      error.textContent = "";
      try {
        const result = await api.request(`/itineraries/${currentTrip._id}/share`, { method: "POST" });
        const url = new URL(result.path, location.origin).href;
        setState(result.sharedAt, result.version);
        dialog.querySelector("#share-result").hidden = false;
        dialog.querySelector("input").value = url;
        dialog.querySelector("#open-share").href = url;
        dialog.querySelector("#share-state").textContent = "Chia sẻ đã bật. Liên kết cũ (nếu có) đã hết hiệu lực.";
        create.textContent = "Tạo liên kết mới";
      } catch (e) { error.textContent = e.message; }
      finally { create.disabled = false; revoke.disabled = !currentTrip.sharedAt; }
    });
    revoke.addEventListener("click", async () => {
      create.disabled = revoke.disabled = true;
      error.textContent = "";
      try {
        const result = await api.request(`/itineraries/${currentTrip._id}/share`, { method: "DELETE" });
        setState(null, result.version);
        dialog.querySelector("#share-result").hidden = true;
        dialog.querySelector("input").value = "";
        dialog.querySelector("#share-state").textContent = "Đã thu hồi. Liên kết cũ không còn mở được lịch trình.";
        create.textContent = "Bật chia sẻ";
      } catch (e) { error.textContent = e.message; }
      finally { create.disabled = false; revoke.disabled = !currentTrip.sharedAt; }
    });
    dialog.querySelector("#copy-share").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(dialog.querySelector("input").value); TM.toast("Đã sao chép liên kết."); }
      catch { dialog.querySelector("input").select(); TM.toast("Hãy sao chép liên kết đang được chọn."); }
    });
  },
  async print() {
    if (!await this.ensureSaved()) return;
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Bản in lịch trình</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>Mở bản in, chọn “In / Lưu PDF”, rồi chọn “Lưu dưới dạng PDF” trong trình duyệt.</p><div class="form-actions"><a class="btn" href="/trip-print/${currentTrip._id}" target="_blank" rel="noopener noreferrer">Mở bản in đã lưu ↗</a></div></div>`, "", "In lịch trình");
    return dialog;
  },
  async suggest() {
    let provinces;
    try { provinces = (await api.request("/destinations?limit=1")).provinces; }
    catch (e) { TM.toast(e.message, true); return; }
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><div><div class="eyebrow">THÊM Ý TƯỞNG CHO CHUYẾN ĐI</div><h2>Gợi ý lịch trình</h2></div><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>Chọn một tỉnh/thành và sở thích. TravelMate sắp xếp tối đa 3 điểm mỗi ngày, dựa trên ngân sách và thời lượng tham quan.</p><form><label class="form-field">Tỉnh / thành phố<select name="province" required>${provinces.map((p) => `<option value="${TM.escape(p)}">${TM.escape(p)}</option>`).join("")}</select></label><fieldset><legend>Sở thích ưu tiên</legend><div class="suggestion-options">${Object.entries(TM.categories).map(([key, label]) => `<label><input type="checkbox" name="categories" value="${key}">${label}</label>`).join("")}</div></fieldset><p class="field-help">Ngân sách ${TM.money(currentTrip.budgetLimitVnd)} cho ${currentTrip.travelers} người, đã trừ các khoản chi bổ sung. Gợi ý dùng dữ liệu tham khảo, cần kiểm tra giá và đường đi.</p><p class="form-error" role="alert"></p><div class="form-actions"><button type="submit" class="btn" ${provinces.length ? "" : "disabled"}>Xem phương án</button></div></form><div class="suggestion-preview" aria-live="polite"></div></div>`, "modal-wide", "Gợi ý lịch trình");
    const form = dialog.querySelector("form"), preview = dialog.querySelector(".suggestion-preview");
    const province = currentTrip.days.flatMap((day) => day.items).find((item) => item.destinationId?.province)?.destinationId.province;
    if (provinces.includes(province)) form.elements.province.value = province;
    form.addEventListener("change", () => { preview.replaceChildren(); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      preview.replaceChildren();
      form.querySelector(".form-error").textContent = "";
      try {
        const result = await api.request("/itineraries/suggestions", { method: "POST", body: {
          province: form.elements.province.value, categories: new FormData(form).getAll("categories"),
          startDate: currentTrip.startDate, endDate: currentTrip.endDate, travelers: currentTrip.travelers,
          budgetLimitVnd: currentTrip.budgetLimitVnd, expenses: currentTrip.expenses || [],
        } });
        if (!dialog.isConnected) return;
        preview.innerHTML = `<h3>Phương án tham khảo</h3>${result.days.map((day, i) => `<article><strong>Ngày ${i + 1} · ${TM.date(day.date)}</strong>${day.items.length ? `<ul>${day.items.map((item) => `<li>${item.visitTime} · ${TM.escape(item.destinationId.name)} · ${TM.money(item.destinationId.estimatedCostPerPersonVnd)} / người</li>`).join("")}</ul>` : '<p class="field-help">Chưa có điểm phù hợp.</p>'}</article>`).join("")}<p><strong>Tổng dự kiến: ${TM.money(result.budget.total)}</strong>${result.budget.missing ? " (chưa đủ giá)" : ""}</p>${result.warnings.map((w) => `<p class="status-note warning">${TM.escape(w)}</p>`).join("")}<div class="form-actions"><button class="btn" id="apply-suggestion" ${result.days.some((day) => day.items.length) ? "" : "disabled"}>Áp dụng danh sách hoạt động</button></div>`;
        preview.querySelector("#apply-suggestion").addEventListener("click", async () => {
          if (currentTrip.days.some((day) => day.items.length) && !await TM.confirm("Thay danh sách hoạt động?", "Phương án này thay toàn bộ hoạt động hiện tại. Ghi chú ngày và các khoản chi bổ sung được giữ lại. Chỉ lưu khi bạn bấm Lưu thay đổi.", "Áp dụng phương án")) return;
          currentTrip.days = result.days.map((day, i) => ({ ...day, notes: currentTrip.days[i].notes }));
          result.days.forEach((day) => TM.cache(day.items.map((item) => item.destinationId)));
          markDirty();
          dialog.close();
          renderEditor();
          TM.toast("Đã áp dụng phương án. Kiểm tra rồi lưu lịch trình.");
        });
      } catch (e) { form.querySelector(".form-error").textContent = e.message; }
      finally { button.disabled = false; }
    });
  },
};
document.querySelector("#trip-editor").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.id === "add-expense") PlannerExtras.editExpense();
  if (button.hasAttribute("data-edit-expense")) PlannerExtras.editExpense(Number(button.dataset.editExpense));
  if (button.hasAttribute("data-remove-expense")) {
    currentTrip.expenses.splice(Number(button.dataset.removeExpense), 1);
    markDirty(); renderEditor();
  }
  if (button.id === "share-trip") PlannerExtras.share();
  if (button.id === "print-trip") PlannerExtras.print();
  if (button.id === "suggest-trip") PlannerExtras.suggest();
});
