(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GroupBudget = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return function groupBudget(trip) {
    const participants = trip.participants || [];
    const balances = new Map(participants.map(p => [p.id, { id: p.id, name: p.name, paid: 0, owed: 0, balance: 0 }]));
    let total = 0;
    for (const expense of trip.actualExpenses || []) {
      total += expense.amountVnd;
      balances.get(expense.paidBy).paid += expense.amountVnd;
      const count = expense.splitBetween.length;
      const quotient = Math.floor(expense.amountVnd / count), remainder = expense.amountVnd % count;
      expense.splitBetween.forEach((id, index) => { balances.get(id).owed += quotient + (index < remainder ? 1 : 0); });
    }
    for (const person of balances.values()) person.balance = person.paid - person.owed;
    for (const settlement of trip.settlements || []) {
      balances.get(settlement.from).balance += settlement.amountVnd;
      balances.get(settlement.to).balance -= settlement.amountVnd;
    }
    const people = [...balances.values()];
    const debtors = people.filter(p => p.balance < 0).map(p => ({ ...p, amount: -p.balance }));
    const creditors = people.filter(p => p.balance > 0).map(p => ({ ...p, amount: p.balance }));
    const transfers = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amountVnd = Math.min(debtors[i].amount, creditors[j].amount);
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amountVnd });
      debtors[i].amount -= amountVnd; creditors[j].amount -= amountVnd;
      if (!debtors[i].amount) i++;
      if (!creditors[j].amount) j++;
    }
    return { total, remaining: trip.budgetLimitVnd - total, people, transfers };
  };
});
