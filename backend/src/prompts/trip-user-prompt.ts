import type { TripPlanRequest } from "../domain/trip";

export const buildTripUserPrompt = (request: TripPlanRequest): string => {
  const preferences =
    request.preferences.length > 0 ? request.preferences.join(", ") : "none";
  const extraRequirements = request.free_text_input?.trim() || "none";

  return `
Plan a ${request.travel_days}-day trip to ${request.city}.

Trip details:
- Destination: ${request.city}
- Start date: ${request.start_date}
- End date: ${request.end_date}
- Travel days: ${request.travel_days}
- Transportation: ${request.transportation}
- Accommodation preference: ${request.accommodation}
- Preferences: ${preferences}
- Extra requirements: ${extraRequirements}
`.trim();
};
