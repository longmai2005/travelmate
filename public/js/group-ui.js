window.TripGroup = {
  render(trip) {
    const e = TM.escape, actual = GroupBudget(trip), canEdit = trip.permissions?.canEdit !== false;
    const people = trip.participants || [], names = new Map(people.map(p => [p.id, p.name]));
    return `<section class="day-card group-panel"><div class="day-heading"><div><div class="eyebrow">CÙNG ĐI, CÙNG CHIA SẺ</div><h3>Chi tiêu thực tế</h3></div>${canEdit ? '<button class="btn outline small" id="group-members">Thành viên chia tiền</button>' : ""}</div><div class="group-totals"><div><small>Đã ghi nhận</small><strong>${TM.money(actual.total)}</strong></div><div><small>So với dự toán</small><strong>${TM.money(TravelBudget(trip).total)}</strong></div><div><small>${actual.remaining < 0 ? "Vượt ngân sách" : "Ngân sách còn lại"}</small><strong>${TM.money(Math.abs(actual.remaining))}</strong></div></div><p class="field-help">Tổng thực tế chỉ gồm khoản đã ghi nhận. Thành viên chia tiền có thể là bạn đồng hành chưa có tài khoản TravelMate.</p><div class="planner-tools">${canEdit ? `<button class="btn light small" id="group-add-expense" ${people.length ? "" : "disabled"}>Thêm chi thực tế</button><button class="btn outline small" id="group-add-settlement" ${people.length > 1 ? "" : "disabled"}>Ghi nhận hoàn trả</button>` : ""}</div>${!people.length ? '<p class="day-empty">Thêm tên người đồng hành để ghi ai trả và chia khoản chi.</p>' : `<div class="table-wrap"><table class="group-table"><thead><tr><th>Thành viên</th><th>Đã trả</th><th>Phần phải chịu</th><th>Số dư sau hoàn trả</th></tr></thead><tbody>${actual.people.map(p => `<tr><td>${e(p.name)}</td><td>${TM.money(p.paid)}</td><td>${TM.money(p.owed)}</td><td>${p.balance > 0 ? `Còn nhận ${TM.money(p.balance)}` : p.balance < 0 ? `Còn trả ${TM.money(-p.balance)}` : "Đã cân bằng"}</td></tr>`).join("")}</tbody></table></div>`}${actual.transfers.length ? `<div class="status-note"><strong>Gợi ý hoàn trả để cân bằng nhóm</strong>${actual.transfers.map(t => `<p>${e(names.get(t.from))} → ${e(names.get(t.to))}: <strong>${TM.money(t.amountVnd)}</strong></p>`).join("")}</div>` : ""}<div class="group-ledger">${(trip.actualExpenses || []).map((expense, index) => `<article class="expense-row"><div><strong>${e(expense.label)}</strong><small>${TM.date(expense.date)} · ${e(names.get(expense.paidBy))} đã trả · Chia cho ${expense.splitBetween.map(id => e(names.get(id))).join(", ")}</small>${expense.note ? `<p>${e(expense.note)}</p>` : ""}</div><strong>${TM.money(expense.amountVnd)}</strong>${canEdit ? `<div class="expense-tools"><button class="icon-btn" data-actual-edit="${index}" aria-label="Sửa ${e(expense.label)}"><i data-lucide="pencil"></i></button><button class="icon-btn" data-actual-delete="${index}" aria-label="Xóa ${e(expense.label)}"><i data-lucide="trash-2"></i></button></div>` : ""}</article>`).join("")}${(trip.settlements || []).map((t, index) => `<article class="expense-row"><div><strong>Hoàn trả đã ghi nhận</strong><small>${e(names.get(t.from))} → ${e(names.get(t.to))}${t.note ? ` · ${e(t.note)}` : ""}</small></div><strong>${TM.money(t.amountVnd)}</strong>${canEdit ? `<button class="icon-btn" data-settlement-delete="${index}" aria-label="Xóa ghi nhận hoàn trả"><i data-lucide="trash-2"></i></button>` : ""}</article>`).join("")}</div><p class="field-help">Tiền VND được chia đến từng đồng; phần dư lần lượt phân cho người trong danh sách chia. Ghi nhận hoàn trả không thực hiện chuyển tiền.</p></section>`;
  },
  members() {
    const people = currentTrip.participants || [];
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Thành viên chia tiền</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>Tối đa ${currentTrip.travelers} người. Mỗi người có mã riêng; đổi tên vẫn giữ các khoản chi.</p><form><div id="group-people"></div><button type="button" class="btn outline small" id="person-add">Thêm người</button><p class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn outline" data-close>Hủy</button><button class="btn" type="submit">Áp dụng thành viên</button></div></form></div>`, "", "Thành viên chia tiền");
    const list = dialog.querySelector("#group-people");
    const row = person => `<div class="person-input"><input aria-label="Tên thành viên" data-person-id="${TM.escape(person.id)}" value="${TM.escape(person.name)}" required maxlength="80"><button type="button" class="icon-btn" data-remove-person aria-label="Bỏ thành viên"><i data-lucide="x"></i></button></div>`;
    list.innerHTML = people.map(row).join("");
    dialog.querySelector("#person-add").addEventListener("click", () => {
      if (list.children.length >= currentTrip.travelers) { dialog.querySelector(".form-error").textContent = "Đã đủ số người của chuyến đi. Tăng số người trong Thông tin chuyến đi nếu cần."; return; }
      list.insertAdjacentHTML("beforeend", row({ id: crypto.randomUUID(), name: "" })); TM.icons(); list.lastElementChild.querySelector("input").focus();
    });
    list.addEventListener("click", event => event.target.closest("[data-remove-person]")?.closest(".person-input").remove());
    dialog.querySelector("form").addEventListener("submit", event => {
      event.preventDefault();
      const next = [...list.querySelectorAll("input")].map(input => ({ id: input.dataset.personId, name: input.value.trim() }));
      const ids = new Set(next.map(p => p.id));
      const used = (currentTrip.actualExpenses || []).some(x => !ids.has(x.paidBy) || x.splitBetween.some(id => !ids.has(id))) || (currentTrip.settlements || []).some(x => !ids.has(x.from) || !ids.has(x.to));
      if (used) { dialog.querySelector(".form-error").textContent = "Thành viên đang được dùng trong khoản chi hoặc hoàn trả. Sửa/xóa các ghi nhận liên quan trước khi bỏ người này."; return; }
      currentTrip.participants = next; markDirty(); dialog.close(); renderEditor();
    });
  },
  expense(index = null) {
    const people = currentTrip.participants || [], e = TM.escape;
    if (!people.length) return this.members();
    const original = index === null ? null : currentTrip.actualExpenses[index];
    const expense = original || { label: "", category: "food", date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()), amountVnd: "", paidBy: people[0].id, splitBetween: people.map(p => p.id), note: "" };
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>${original ? "Sửa" : "Thêm"} khoản đã chi</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><form><div class="form-grid"><label class="form-field full">Tên khoản chi<input name="label" required maxlength="120" value="${e(expense.label)}"></label><label class="form-field">Ngày chi<input name="date" type="date" required value="${e(expense.date)}"></label><label class="form-field">Số tiền (VND)<input name="amountVnd" type="number" required min="1" max="1000000000" step="1" value="${expense.amountVnd}"></label><label class="form-field">Nhóm chi phí<select name="category">${Object.entries(TripView.labels).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></label><label class="form-field">Người đã trả<select name="paidBy">${people.map(p => `<option value="${e(p.id)}">${e(p.name)}</option>`).join("")}</select></label></div><fieldset><legend>Chia đều cho những ai?</legend><div class="suggestion-options">${people.map(p => `<label><input name="splitBetween" type="checkbox" value="${e(p.id)}" ${expense.splitBetween.includes(p.id) ? "checked" : ""}>${e(p.name)}</label>`).join("")}</div></fieldset><label class="form-field">Ghi chú<textarea name="note" maxlength="500">${e(expense.note)}</textarea></label><p class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn outline" data-close>Hủy</button><button class="btn" type="submit">Áp dụng khoản chi</button></div></form></div>`, "modal-wide", "Chi tiêu thực tế");
    const form = dialog.querySelector("form"); form.elements.category.value = expense.category; form.elements.paidBy.value = expense.paidBy;
    form.addEventListener("submit", event => {
      event.preventDefault(); const data = Object.fromEntries(new FormData(form)); data.splitBetween = new FormData(form).getAll("splitBetween"); data.amountVnd = Number(data.amountVnd); data.id = original?.id || crypto.randomUUID();
      if (!data.splitBetween.length) { form.querySelector(".form-error").textContent = "Chọn ít nhất một người chia khoản chi."; return; }
      currentTrip.actualExpenses ||= [];
      if (index === null && currentTrip.actualExpenses.length >= 200) { form.querySelector(".form-error").textContent = "Tối đa 200 khoản chi thực tế."; return; }
      if (index === null) currentTrip.actualExpenses.push(data); else currentTrip.actualExpenses[index] = data;
      markDirty(); dialog.close(); renderEditor();
    });
  },
  settlement() {
    const people = currentTrip.participants || [], e = TM.escape;
    if (people.length < 2) return;
    const options = people.map(p => `<option value="${e(p.id)}">${e(p.name)}</option>`).join("");
    const dialog = TM.dialog(`<div class="modal-body"><div class="modal-heading"><h2>Ghi nhận hoàn trả</h2><button class="icon-btn" data-close aria-label="Đóng"><i data-lucide="x"></i></button></div><p>Chỉ ghi khoản đã hoàn trả thực tế. TravelMate không chuyển tiền.</p><form><div class="form-grid"><label class="form-field">Người trả<select name="from">${options}</select></label><label class="form-field">Người nhận<select name="to">${options}</select></label><label class="form-field full">Số tiền (VND)<input name="amountVnd" type="number" required min="1" max="1000000000" step="1"></label><label class="form-field full">Ghi chú<input name="note" maxlength="500"></label></div><p class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn outline" data-close>Hủy</button><button class="btn" type="submit">Áp dụng hoàn trả</button></div></form></div>`, "", "Hoàn trả trong nhóm");
    const form = dialog.querySelector("form"); form.elements.to.value = people[1].id;
    form.addEventListener("submit", event => {
      event.preventDefault(); const data = Object.fromEntries(new FormData(form));
      if (data.from === data.to) { form.querySelector(".form-error").textContent = "Người trả và nhận phải khác nhau."; return; }
      currentTrip.settlements ||= [];
      if (currentTrip.settlements.length >= 200) { form.querySelector(".form-error").textContent = "Tối đa 200 lần hoàn trả."; return; }
      currentTrip.settlements.push({ ...data, id: crypto.randomUUID(), amountVnd: Number(data.amountVnd) }); markDirty(); dialog.close(); renderEditor();
    });
  },
};
document.querySelector("#trip-editor").addEventListener("click", async event => {
  const button = event.target.closest("button"); if (!button || currentTrip?.permissions?.canEdit === false) return;
  if (button.id === "group-members") TripGroup.members();
  if (button.id === "group-add-expense") TripGroup.expense();
  if (button.id === "group-add-settlement") TripGroup.settlement();
  if (button.hasAttribute("data-actual-edit")) TripGroup.expense(Number(button.dataset.actualEdit));
  if (button.hasAttribute("data-actual-delete") && await TM.confirm("Xóa khoản đã chi?", "Số dư và đề xuất hoàn trả sẽ được tính lại.", "Xóa khoản chi")) { currentTrip.actualExpenses.splice(Number(button.dataset.actualDelete), 1); markDirty(); renderEditor(); }
  if (button.hasAttribute("data-settlement-delete") && await TM.confirm("Xóa ghi nhận hoàn trả?", "Số dư nhóm sẽ được tính lại.", "Xóa ghi nhận")) { currentTrip.settlements.splice(Number(button.dataset.settlementDelete), 1); markDirty(); renderEditor(); }
});
