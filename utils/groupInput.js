const { text, integer, fail } = require("./validation");
function groupInput(body, travelers) {
  const participants = body.participants ?? [], actualExpenses = body.actualExpenses ?? [], settlements = body.settlements ?? [];
  if (!Array.isArray(participants) || participants.length > travelers) fail("Số thành viên ghi chi tiêu không được vượt số người của chuyến đi.");
  if (!Array.isArray(actualExpenses) || actualExpenses.length > 200 || !Array.isArray(settlements) || settlements.length > 200) fail("Tối đa 200 khoản chi và 200 lần hoàn trả.");
  const ids = new Set(), expenseIds = new Set(), transferIds = new Set();
  function identifier(value, set) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,50}$/.test(value) || set.has(value)) fail("Mã thành viên hoặc khoản chi không hợp lệ / bị trùng.");
    set.add(value); return value;
  }
  function member(id) { if (!ids.has(id)) fail("Khoản chi tham chiếu thành viên không còn trong nhóm."); return id; }
  const people = participants.map(p => {
    if (!p || typeof p !== "object") fail("Thành viên không hợp lệ.");
    return { id: identifier(p.id, ids), name: text(p.name, "Tên thành viên", 80) };
  });
  const expenses = actualExpenses.map(expense => {
    if (!expense || typeof expense !== "object") fail("Khoản chi không hợp lệ.");
    if (!["activities", "accommodation", "transport", "food", "other"].includes(expense.category)) fail("Nhóm khoản chi không hợp lệ.");
    if (!Array.isArray(expense.splitBetween) || !expense.splitBetween.length || new Set(expense.splitBetween).size !== expense.splitBetween.length) fail("Chọn ít nhất một người chia khoản chi, không được trùng.");
    const date = require("./adminData").dateFilter(expense.date, "Ngày chi");
    if (!date) fail("Cần nhập ngày chi.");
    return { id: identifier(expense.id, expenseIds), label: text(expense.label, "Tên khoản chi", 120), category: expense.category, date,
      amountVnd: integer(expense.amountVnd, "Số tiền đã chi", 1, 1e9), paidBy: member(expense.paidBy), splitBetween: expense.splitBetween.map(member), note: text(expense.note ?? "", "Ghi chú chi tiêu", 500, false) };
  });
  const payments = settlements.map(payment => {
    if (!payment || typeof payment !== "object" || payment.from === payment.to) fail("Người trả và người nhận phải khác nhau.");
    return { id: identifier(payment.id, transferIds), from: member(payment.from), to: member(payment.to), amountVnd: integer(payment.amountVnd, "Số tiền hoàn trả", 1, 1e9), note: text(payment.note ?? "", "Ghi chú hoàn trả", 500, false) };
  });
  return { participants: people, actualExpenses: expenses, settlements: payments };
}
module.exports = groupInput;
