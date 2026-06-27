import type { TripPlan } from "../../types";

type BudgetField = keyof NonNullable<TripPlan["budget"]>;

export function BudgetPanel({
  budget,
  editMode = false,
  onUpdate,
}: {
  budget: NonNullable<TripPlan["budget"]>;
  editMode?: boolean;
  onUpdate?: (field: BudgetField, value: number) => void;
}) {
  const items: Array<[string, number, BudgetField]> = [
    ["Attractions", budget.total_attractions, "total_attractions"],
    ["Hotels", budget.total_hotels, "total_hotels"],
    ["Meals", budget.total_meals, "total_meals"],
    ["Transportation", budget.total_transportation, "total_transportation"],
  ];

  return (
    <>
      <div className="budget-grid">
        {items.map(([label, value, field]) => (
          <div className="budget-item" key={label}>
            <span>{label}</span>
            {editMode ? (
              <label className="budget-input">
                <span className="visually-hidden">{label}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={value}
                  onChange={(event) =>
                    onUpdate?.(field, Number(event.target.value))
                  }
                />
              </label>
            ) : (
              <strong>¥{value}</strong>
            )}
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
