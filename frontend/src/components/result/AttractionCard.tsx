import type { Attraction } from "../../types";
import { InfoRow } from "../ui/InfoCard";

type AttractionCardProps = {
  attraction: Attraction;
  index: number;
  editMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onUpdate: (
    field: keyof Pick<Attraction, "address" | "description" | "visit_duration">,
    value: string | number,
  ) => void;
};

export function AttractionCard({
  attraction,
  index,
  editMode,
  canMoveUp,
  canMoveDown,
  onMove,
  onDelete,
  onUpdate,
}: AttractionCardProps) {
  return (
    <article className="attraction-card">
      <div className={`attraction-image gradient-${index % 5}`}>
        <span className="attraction-number">{index + 1}</span>
        {attraction.ticket_price ? (
          <span className="price-tag">¥{attraction.ticket_price}</span>
        ) : null}
        <strong>{attraction.name}</strong>
      </div>

      <div className="attraction-card-body">
        <div className="attraction-card-header">
          <h3>{attraction.name}</h3>
          {editMode && (
            <div className="small-actions">
              <button
                type="button"
                onClick={() => onMove("up")}
                disabled={!canMoveUp}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove("down")}
                disabled={!canMoveDown}
              >
                ↓
              </button>
              <button type="button" onClick={onDelete}>
                Delete
              </button>
            </div>
          )}
        </div>

        {editMode ? (
          <div className="edit-fields">
            <label>
              <span>Address</span>
              <input
                value={attraction.address}
                onChange={(event) => onUpdate("address", event.target.value)}
              />
            </label>
            <label>
              <span>Visit Duration (minutes)</span>
              <input
                type="number"
                min={10}
                max={480}
                value={attraction.visit_duration}
                onChange={(event) =>
                  onUpdate("visit_duration", event.target.value)
                }
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={2}
                value={attraction.description}
                onChange={(event) =>
                  onUpdate("description", event.target.value)
                }
              />
            </label>
          </div>
        ) : (
          <div className="attraction-details">
            <InfoRow label="Address" value={attraction.address} />
            <InfoRow
              label="Visit Duration"
              value={`${attraction.visit_duration} minutes`}
            />
            <InfoRow label="Description" value={attraction.description} />
            {attraction.rating ? (
              <InfoRow label="Rating" value={`${attraction.rating}`} />
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
