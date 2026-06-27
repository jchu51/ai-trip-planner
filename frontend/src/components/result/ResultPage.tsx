import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { STORAGE_KEY } from "../../constants/storage";
import type { Attraction, Meal, TripPlan } from "../../types";
import { InfoCard, InfoRow, SectionDivider } from "../ui/InfoCard";
import { AttractionCard } from "./AttractionCard";
import { BudgetPanel } from "./BudgetPanel";
import { TripMap } from "./TripMap";

const mealLabels: Record<Meal["type"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type ResultPageProps = {
  tripPlan: TripPlan | null;
  onBack: () => void;
  onPlanChange: (plan: TripPlan) => void;
};

export function ResultPage({
  tripPlan,
  onBack,
  onPlanChange,
}: ResultPageProps) {
  const [plan, setPlan] = useState<TripPlan | null>(tripPlan);
  const [editMode, setEditMode] = useState(false);
  const [originalPlan, setOriginalPlan] = useState<TripPlan | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [notice, setNotice] = useState("");
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPlan(tripPlan);
  }, [tripPlan]);

  if (!plan) {
    return (
      <main className="empty-page">
        <div className="empty-symbol">🗺️</div>
        <h1>No trip plan found</h1>
        <p>Create a trip first to see the itinerary here.</p>
        <button
          className="primary-action compact"
          type="button"
          onClick={onBack}
        >
          Back to Create Trip
        </button>
      </main>
    );
  }

  const startEdit = () => {
    setOriginalPlan(structuredClone(plan));
    setEditMode(true);
    setNotice("Edit mode enabled");
  };

  const saveChanges = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    setEditMode(false);
    setOriginalPlan(null);
    setNotice("Changes saved");
    onPlanChange(plan);
  };

  const cancelEdit = () => {
    if (originalPlan) {
      setPlan(originalPlan);
    }
    setEditMode(false);
    setNotice("Edit canceled");
  };

  const updateAttraction = (
    dayIndex: number,
    attractionIndex: number,
    field: keyof Pick<Attraction, "address" | "description" | "visit_duration">,
    value: string | number,
  ) => {
    setPlan((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      const attraction = next.days[dayIndex].attractions[attractionIndex];
      if (field === "visit_duration") {
        attraction.visit_duration = Number(value);
      } else {
        attraction[field] = String(value);
      }
      return next;
    });
  };

  const deleteAttraction = (dayIndex: number, attractionIndex: number) => {
    setPlan((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      if (next.days[dayIndex].attractions.length <= 1) {
        setNotice("Each day must keep at least one attraction");
        return current;
      }
      next.days[dayIndex].attractions.splice(attractionIndex, 1);
      setNotice("Attraction deleted");
      return next;
    });
  };

  const moveAttraction = (
    dayIndex: number,
    attractionIndex: number,
    direction: "up" | "down",
  ) => {
    setPlan((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      const attractions = next.days[dayIndex].attractions;
      const target =
        direction === "up" ? attractionIndex - 1 : attractionIndex + 1;
      if (!attractions[target]) return current;
      [attractions[attractionIndex], attractions[target]] = [
        attractions[target],
        attractions[attractionIndex],
      ];
      return next;
    });
  };

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const captureExportCanvas = async () => {
    if (!exportRef.current) return;

    return html2canvas(exportRef.current, {
      backgroundColor: "#f5f7fa",
      scale: 2,
      useCORS: true,
      windowWidth: exportRef.current.scrollWidth,
      windowHeight: exportRef.current.scrollHeight,
      onclone: (clonedDocument) => {
        clonedDocument.body.classList.add("export-mode");
      },
    });
  };

  const exportAsImage = async () => {
    const canvas = await captureExportCanvas();
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `trip_plan_${plan.city}_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setNotice("Image exported");
  };

  const exportAsPdf = async () => {
    const canvas = await captureExportCanvas();
    if (!canvas) return;

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`trip_plan_${plan.city}_${Date.now()}.pdf`);
    setNotice("PDF exported");
  };

  return (
    <main className="result-page">
      <div className="result-toolbar">
        <button
          className="secondary-action compact"
          type="button"
          onClick={onBack}
        >
          Back Home
        </button>
        <div className="toolbar-actions">
          {!editMode ? (
            <button
              className="secondary-action compact"
              type="button"
              onClick={startEdit}
            >
              Edit Trip
            </button>
          ) : (
            <>
              <button
                className="primary-action compact"
                type="button"
                onClick={saveChanges}
              >
                Save Changes
              </button>
              <button
                className="secondary-action compact"
                type="button"
                onClick={cancelEdit}
              >
                Cancel Edit
              </button>
            </>
          )}
          <button
            className="secondary-action compact"
            type="button"
            onClick={exportAsImage}
            disabled={editMode}
          >
            Export Image
          </button>
          <button
            className="secondary-action compact"
            type="button"
            onClick={exportAsPdf}
            disabled={editMode}
          >
            Export PDF
          </button>
        </div>
      </div>

      {notice && <div className="notice success">{notice}</div>}

      <div className="result-layout">
        <aside className="side-nav">
          <button type="button" onClick={() => scrollTo("overview")}>
            Overview
          </button>
          {plan.budget && (
            <button type="button" onClick={() => scrollTo("budget")}>
              Budget
            </button>
          )}
          <button type="button" onClick={() => scrollTo("map")}>
            Map
          </button>
          {plan.days.map((day, index) => (
            <button
              key={day.date}
              type="button"
              className={activeDay === index ? "active" : ""}
              onClick={() => {
                setActiveDay(index);
                scrollTo(`day-${index}`);
              }}
            >
              Day {index + 1}
            </button>
          ))}
          {plan.weather_info.length > 0 && (
            <button type="button" onClick={() => scrollTo("weather")}>
              Weather
            </button>
          )}
        </aside>

        <div className="main-content" ref={exportRef}>
          <InfoCard id="overview" title={`${plan.city} Trip Plan`}>
            <div className="overview-list">
              <InfoRow
                label="Date"
                value={`${plan.start_date} to ${plan.end_date}`}
              />
              <InfoRow label="Notes" value={plan.overall_suggestions} />
            </div>
          </InfoCard>

          {plan.budget && (
            <InfoCard id="budget" title="Budget">
              <BudgetPanel budget={plan.budget} />
            </InfoCard>
          )}

          <InfoCard id="map" title="Map" className="map-card">
            <TripMap days={plan.days} routes={plan.routes ?? []} />
          </InfoCard>

          <InfoCard title="Daily Itinerary" className="days-card">
            {plan.days.map((day, dayIndex) => (
              <details
                key={day.date}
                id={`day-${dayIndex}`}
                className="day-panel"
                open={activeDay === dayIndex}
                onToggle={(event) => {
                  if (event.currentTarget.open) setActiveDay(dayIndex);
                }}
              >
                <summary>
                  <span>Day {dayIndex + 1}</span>
                  <span>{day.date}</span>
                </summary>

                <div className="day-info">
                  <InfoRow label="Description" value={day.description} />
                  <InfoRow label="Transportation" value={day.transportation} />
                  <InfoRow label="Accommodation" value={day.accommodation} />
                </div>

                <SectionDivider title="Attractions" />
                <div className="attraction-grid">
                  {day.attractions.map((attraction, attractionIndex) => (
                    <AttractionCard
                      key={`${day.date}-${attraction.name}-${attractionIndex}`}
                      attraction={attraction}
                      index={attractionIndex}
                      editMode={editMode}
                      onMove={(direction) =>
                        moveAttraction(dayIndex, attractionIndex, direction)
                      }
                      onDelete={() =>
                        deleteAttraction(dayIndex, attractionIndex)
                      }
                      onUpdate={(field, value) =>
                        updateAttraction(
                          dayIndex,
                          attractionIndex,
                          field,
                          value,
                        )
                      }
                      canMoveUp={attractionIndex > 0}
                      canMoveDown={attractionIndex < day.attractions.length - 1}
                    />
                  ))}
                </div>

                {day.hotel && (
                  <>
                    <SectionDivider title="Hotel Recommendation" />
                    <div className="hotel-card">
                      <h4>{day.hotel.name}</h4>
                      <dl>
                        <div>
                          <dt>Address</dt>
                          <dd>{day.hotel.address}</dd>
                        </div>
                        <div>
                          <dt>Type</dt>
                          <dd>{day.hotel.type}</dd>
                        </div>
                        <div>
                          <dt>Price Range</dt>
                          <dd>{day.hotel.price_range}</dd>
                        </div>
                        <div>
                          <dt>Rating</dt>
                          <dd>{day.hotel.rating}</dd>
                        </div>
                        <div>
                          <dt>Distance</dt>
                          <dd>{day.hotel.distance}</dd>
                        </div>
                      </dl>
                    </div>
                  </>
                )}

                <SectionDivider title="Meals" />
                <div className="meal-list">
                  {day.meals.map((meal) => (
                    <div key={`${day.date}-${meal.type}`} className="meal-row">
                      <strong>{mealLabels[meal.type]}</strong>
                      <span>
                        {meal.name}
                        {meal.description ? ` - ${meal.description}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </InfoCard>

          {plan.weather_info.length > 0 && (
            <InfoCard id="weather" title="Weather">
              <div className="weather-grid">
                {plan.weather_info.map((weather) => (
                  <div className="weather-card" key={weather.date}>
                    <h3>{weather.date}</h3>
                    <InfoRow
                      label="Day"
                      value={`${weather.day_weather} ${weather.day_temp}°C`}
                    />
                    <InfoRow
                      label="Night"
                      value={`${weather.night_weather} ${weather.night_temp}°C`}
                    />
                    <InfoRow
                      label="Wind"
                      value={`${weather.wind_direction} ${weather.wind_power}`}
                    />
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      </div>
    </main>
  );
}
