import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { generateTripPlan } from "../../api";
import type { TripFormData, TripPlan } from "../../types";

const preferenceOptions = [
  "History and culture",
  "Nature",
  "Food",
  "Shopping",
  "Art",
  "Leisure",
];

const loadingSteps = [
  "Getting started...",
  "Searching for places...",
  "Checking weather...",
  "Finding hotels...",
  "Building your itinerary...",
];

type HomePageProps = {
  onPlanGenerated: (plan: TripPlan) => void;
  onUseSample: () => void;
};

export function HomePage({ onPlanGenerated, onUseSample }: HomePageProps) {
  const [formData, setFormData] = useState<TripFormData>({
    city: "",
    start_date: "",
    end_date: "",
    travel_days: 1,
    transportation: "Public transit",
    accommodation: "Economy hotel",
    preferences: [],
    free_text_input: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState(loadingSteps[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!formData.start_date || !formData.end_date) return;

    const start = new Date(`${formData.start_date}T00:00:00`);
    const end = new Date(`${formData.end_date}T00:00:00`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

    if (days > 0 && days <= 30) {
      setFormData((current) => ({ ...current, travel_days: days }));
      setError("");
      return;
    }

    setFormData((current) => ({ ...current, end_date: "", travel_days: 1 }));
    setError(
      days > 30
        ? "Trip length cannot exceed 30 days"
        : "End date cannot be earlier than start date",
    );
  }, [formData.start_date, formData.end_date]);

  const updateField = <Key extends keyof TripFormData>(
    key: Key,
    value: TripFormData[Key],
  ) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const togglePreference = (preference: string) => {
    setFormData((current) => {
      const exists = current.preferences.includes(preference);
      return {
        ...current,
        preferences: exists
          ? current.preferences.filter((item) => item !== preference)
          : [...current.preferences, preference],
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.city.trim() || !formData.start_date || !formData.end_date) {
      setError("Enter a destination and select both dates");
      return;
    }

    setLoading(true);
    setError("");
    setLoadingProgress(0);
    setLoadingStatus(loadingSteps[0]);

    const interval = window.setInterval(() => {
      setLoadingProgress((current) => {
        const next = Math.min(current + 10, 90);
        const stepIndex = Math.min(
          Math.floor(next / 25),
          loadingSteps.length - 1,
        );
        setLoadingStatus(loadingSteps[stepIndex]);
        return next;
      });
    }, 700);

    try {
      const response = await generateTripPlan(formData);
      window.clearInterval(interval);
      setLoadingProgress(100);
      setLoadingStatus("Done");

      if (!response.success || !response.data) {
        throw new Error(response.message || "Generation failed");
      }

      window.setTimeout(() => onPlanGenerated(response.data!), 250);
    } catch (caught) {
      window.clearInterval(interval);
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to generate trip plan",
      );
    } finally {
      window.setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStatus(loadingSteps[0]);
      }, 700);
    }
  };

  return (
    <main className="home-page">
      <div className="bg-circle circle-a" />
      <div className="bg-circle circle-b" />
      <div className="bg-circle circle-c" />

      <section className="hero">
        <div className="hero-icon" aria-hidden="true">
          ✈️
        </div>
        <h1>AI Trip Planner</h1>
        <p>Personalized AI travel planning for smoother, easier trips</p>
      </section>

      <form className="planner-form" onSubmit={handleSubmit}>
        <FormSection icon="📍" title="Destination and Dates">
          <div className="form-grid dates-grid">
            <label>
              <span>Destination City</span>
              <input
                value={formData.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="e.g. Tokyo"
                required
              />
            </label>
            <label>
              <span>Start Date</span>
              <input
                type="date"
                value={formData.start_date}
                onChange={(event) =>
                  updateField("start_date", event.target.value)
                }
                required
              />
            </label>
            <label>
              <span>End Date</span>
              <input
                type="date"
                value={formData.end_date}
                onChange={(event) =>
                  updateField("end_date", event.target.value)
                }
                required
              />
            </label>
            <div
              className="days-display"
              aria-label={`Trip length ${formData.travel_days} days`}
            >
              <strong>{formData.travel_days}</strong>
              <span>{formData.travel_days === 1 ? "day" : "days"}</span>
            </div>
          </div>
        </FormSection>

        <FormSection icon="⚙️" title="Preferences">
          <div className="form-grid preference-grid">
            <label>
              <span>Transportation</span>
              <select
                value={formData.transportation}
                onChange={(event) =>
                  updateField("transportation", event.target.value)
                }
              >
                <option value="Public transit">Public transit</option>
                <option value="Driving">Driving</option>
                <option value="Walking">Walking</option>
                <option value="Mixed">Mixed</option>
              </select>
            </label>
            <label>
              <span>Accommodation</span>
              <select
                value={formData.accommodation}
                onChange={(event) =>
                  updateField("accommodation", event.target.value)
                }
              >
                <option value="Economy hotel">Economy hotel</option>
                <option value="Comfort hotel">Comfort hotel</option>
                <option value="Luxury hotel">Luxury hotel</option>
                <option value="Guesthouse">Guesthouse</option>
              </select>
            </label>
            <fieldset className="tag-fieldset">
              <legend>Travel Preferences</legend>
              <div className="tag-list">
                {preferenceOptions.map((preference) => (
                  <label
                    key={preference}
                    className={`preference-tag ${
                      formData.preferences.includes(preference)
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.preferences.includes(preference)}
                      onChange={() => togglePreference(preference)}
                    />
                    {preference}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </FormSection>

        <FormSection icon="💬" title="Additional Requirements">
          <label>
            <span className="visually-hidden">Additional Requirements</span>
            <textarea
              value={formData.free_text_input}
              onChange={(event) =>
                updateField("free_text_input", event.target.value)
              }
              rows={3}
              placeholder="Add extra needs, such as accessibility, allergies, must-see places, or travel pace..."
            />
          </label>
        </FormSection>

        {error && <div className="notice error">{error}</div>}

        <div className="form-actions">
          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? "Generating..." : "Plan My Trip"}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={onUseSample}
          >
            View Sample Trip
          </button>
        </div>

        {loading && (
          <div className="loading-panel" aria-live="polite">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p>{loadingStatus}</p>
          </div>
        )}
      </form>
    </main>
  );
}

type FormSectionProps = {
  icon: string;
  title: string;
  children: ReactNode;
};

function FormSection({ icon, title, children }: FormSectionProps) {
  return (
    <section className="form-section">
      <div className="section-title">
        <span aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
