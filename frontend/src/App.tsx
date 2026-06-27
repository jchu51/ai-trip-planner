import { useState } from "react";
import { HomePage } from "./components/home/HomePage";
import { ResultPage } from "./components/result/ResultPage";
import { STORAGE_KEY } from "./constants/storage";
import { sampleTripPlan } from "./sample-trip";
import type { TripPlan } from "./types";

function App() {
  const [view, setView] = useState<"home" | "result">(() =>
    sessionStorage.getItem(STORAGE_KEY) ? "result" : "home",
  );
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as TripPlan) : null;
  });

  const openResult = (plan: TripPlan) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    setTripPlan(plan);
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">AI Trip Planner</div>
        <div className="header-note">HelloAgents learning project</div>
      </header>
      {view === "home" ? (
        <HomePage
          onPlanGenerated={openResult}
          onUseSample={() => openResult(sampleTripPlan)}
        />
      ) : (
        <ResultPage
          tripPlan={tripPlan}
          onBack={goHome}
          onPlanChange={openResult}
        />
      )}
      <footer className="app-footer">
        AI Trip Planner based on HelloAgents Chapter 13
      </footer>
    </div>
  );
}

export default App;
