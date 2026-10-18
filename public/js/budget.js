(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TravelBudget = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return function calculateBudget(trip) {
    let total = 0, missing = 0;
    const breakdown = { activities: 0, accommodation: 0, transport: 0, food: 0, other: 0 };
    trip.days.forEach((day) => day.items.forEach((item) => {
      const cost = item.customCostPerPersonVnd ?? item.destinationId?.estimatedCostPerPersonVnd;
      if (cost == null) missing++;
      else breakdown.activities += cost * trip.travelers;
    }));
    total = breakdown.activities;
    (trip.expenses || []).forEach((expense) => {
      const amount = expense.amountVnd * (expense.scope === "person" ? trip.travelers : 1);
      breakdown[expense.category] += amount;
      total += amount;
    });
    return { total, missing, breakdown, remaining: trip.budgetLimitVnd - total,
      percent: trip.budgetLimitVnd ? Math.round(total / trip.budgetLimitVnd * 100) : total ? 100 : 0 };
  };
});
