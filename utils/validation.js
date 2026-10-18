const mongoose = require("mongoose");
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function text(value, label, max, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail(`${label} không hợp lệ (tối đa ${max} ký tự).`);
  return value.trim();
}
function integer(value, label, min = 0, max = 1e12) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    fail(`${label} phải là số nguyên từ ${min} đến ${max}.`);
  return value;
}
function objectId(id) {
  if (typeof id !== "string" || !mongoose.isObjectIdOrHexString(id))
    fail("Mã dữ liệu không hợp lệ.");
  return id.toLowerCase();
}
function dates(start, end) {
  const valid = (s) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(start) || !valid(end)) fail("Ngày đi và ngày về không hợp lệ.");
  const count = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (count < 1 || count > 7) fail("Lịch trình phải kéo dài từ 1 đến 7 ngày.");
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10),
  );
}
function validateItinerary(body) {
  const title = text(body.title, "Tên chuyến đi", 150);
  const dayDates = dates(body.startDate, body.endDate);
  const travelers = integer(body.travelers, "Số người", 1, 100);
  const budgetLimitVnd = integer(body.budgetLimitVnd, "Ngân sách");
  if (!Array.isArray(body.days) || body.days.length !== dayDates.length)
    fail("Cấu trúc ngày chưa khớp với khoảng thời gian.");
  const days = body.days.map((day, i) => {
    if (
      !day ||
      typeof day !== "object" ||
      day.date !== dayDates[i] ||
      !Array.isArray(day.items) ||
      day.items.length > 30
    )
      fail("Ngày hoặc số hoạt động không hợp lệ.");
    const ids = new Set();
    const items = day.items.map((item, order) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        fail("Hoạt động không hợp lệ.");
      const id = objectId(item.destinationId);
      if (ids.has(id))
        fail("Một địa điểm chỉ được thêm một lần trong cùng ngày.");
      ids.add(id);
      const visitTime = text(item.visitTime ?? "", "Giờ ghé thăm", 5, false);
      if (visitTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime))
        fail("Giờ ghé thăm không hợp lệ.");
      return {
        destinationId: id,
        visitTime,
        note: text(item.note ?? "", "Ghi chú hoạt động", 500, false),
        customCostPerPersonVnd:
          item.customCostPerPersonVnd == null
            ? null
            : integer(item.customCostPerPersonVnd, "Chi phí hoạt động", 0, 1e9),
        order,
      };
    });
    return {
      date: day.date,
      notes: text(day.notes ?? "", "Ghi chú ngày", 500, false),
      items,
    };
  });
  return {
    title,
    startDate: body.startDate,
    endDate: body.endDate,
    travelers,
    budgetLimitVnd,
    notes: text(body.notes ?? "", "Ghi chú", 2000, false),
    expenses: validateExpenses(body.expenses ?? []),
    days,
  };
}
function validateExpenses(expenses) {
  if (!Array.isArray(expenses) || expenses.length > 100)
    fail("Chỉ được nhập tối đa 100 khoản chi.");
  return expenses.map((expense) => {
    if (!expense || typeof expense !== "object" || Array.isArray(expense)) fail("Khoản chi không hợp lệ.");
    if (!["accommodation", "transport", "food", "other"].includes(expense.category)) fail("Loại khoản chi không hợp lệ.");
    if (!["trip", "person"].includes(expense.scope)) fail("Cách tính khoản chi không hợp lệ.");
    return {
      label: text(expense.label, "Tên khoản chi", 120),
      category: expense.category,
      amountVnd: integer(expense.amountVnd, "Khoản chi", 0, 1e9),
      scope: expense.scope,
    };
  });
}
const budget = require("../public/js/budget");
module.exports = {
  fail,
  text,
  integer,
  objectId,
  dates,
  validateItinerary,
  budget,
  validateExpenses,
};
