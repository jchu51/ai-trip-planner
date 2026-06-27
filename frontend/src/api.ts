import type { TripFormData, TripPlanResponse } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export async function generateTripPlan(
  formData: TripFormData,
): Promise<TripPlanResponse> {
  const response = await fetch(`${API_BASE_URL}/api/trip/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  const data = (await response.json().catch(() => null)) as
    | TripPlanResponse
    | { detail?: string; message?: string }
    | null;

  console.log("data", data);
  if (!response.ok) {
    const errorData = data as { detail?: string; message?: string } | null;
    throw new Error(
      errorData?.message ??
        errorData?.detail ??
        `Request failed with ${response.status}`,
    );
  }

  return data as TripPlanResponse;
}
