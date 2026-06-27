import type { TripPlan } from "../../types";

export function BudgetPanel({
  budget,
}: {
  budget: NonNullable<TripPlan["budget"]>;
}) {
  const items = [
    ["Attractions", budget.total_attractions],
    ["Hotels", budget.total_hotels],
    ["Meals", budget.total_meals],
    ["Transportation", budget.total_transportation],
  ] as const;

  return (
    <>
      <div className="budget-grid">
        {items.map(([label, value]) => (
          <div className="budget-item" key={label}>
            <span>{label}</span>
            <strong>¥{value}</strong>
          </div>
        ))}
      </div>
      <div className="budget-total">
        <span>Estimated Total</span>
        <strong>¥{budget.total}</strong>
      </div>
    </>
  );
}
