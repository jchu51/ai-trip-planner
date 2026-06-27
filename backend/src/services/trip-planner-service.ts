import type { ConfigurableModel } from "langchain/chat_models/universal";
import {
  HotelAgent,
  LookupWeatherAgent,
  PlannerAgent,
  SearchPlacesAgent,
} from "../agents";
import { type TripPlan, type TripPlanRequest } from "../domain/trip";
import { GoogleMapsToolProvider } from "../mcp/tools/google-maps-tool-provider";
import { buildTripUserPrompt } from "../prompts/trip-user-prompt";

export class TripPlannerService {
  private readonly model: ConfigurableModel;
  private readonly googleMapsToolProvider: GoogleMapsToolProvider;

  constructor(
    model: ConfigurableModel,
    googleMapsToolProvider: GoogleMapsToolProvider,
  ) {
    this.model = model;
    this.googleMapsToolProvider = googleMapsToolProvider;
  }

  async planTrip(request: TripPlanRequest): Promise<TripPlan> {
    const userPrompt = buildTripUserPrompt(request);

    const weatherAgent = new LookupWeatherAgent(
      "lookupWeatherAgent",
      this.model,
      this.googleMapsToolProvider,
      request.city,
    );

    const searchPlacesAgent = new SearchPlacesAgent(
      "searchPlacesAgent",
      this.model,
      this.googleMapsToolProvider,
      request.city,
    );
    const hotelAgent = new HotelAgent(
      "hotelAgent",
      this.model,
      this.googleMapsToolProvider,
      request.city,
    );
    const plannerAgent = new PlannerAgent(
      "plannerAgent",
      this.model,
      this.googleMapsToolProvider,
      request.city,
    );

    const [weatherResult, placesResult, hotelsResult] = await Promise.allSettled([
      weatherAgent.run(userPrompt),
      searchPlacesAgent.run(userPrompt),
      hotelAgent.run(userPrompt),
    ]);

    if (weatherResult.status === "rejected") {
      console.error("Weather agent failed:", weatherResult.reason);
    }
    if (placesResult.status === "rejected") {
      console.error("Places agent failed:", placesResult.reason);
    }
    if (hotelsResult.status === "rejected") {
      console.error("Hotel agent failed:", hotelsResult.reason);
    }

    const weather =
      weatherResult.status === "fulfilled"
        ? weatherResult.value
        : "Weather data unavailable.";
    const places =
      placesResult.status === "fulfilled"
        ? placesResult.value
        : "Places data unavailable.";
    const hotels =
      hotelsResult.status === "fulfilled"
        ? hotelsResult.value
        : "Hotel data unavailable.";

    const plannerInput = `
        Original user request:
        ${userPrompt}

        Weather agent output:
        ${weather}

        Search places agent output:
        ${places}

        Hotel agent output:
        ${hotels}
    `.trim();

    try {
      const plan = await plannerAgent.run(plannerInput);
      return this.ensureRouteConnections(plan, request);
    } catch (error) {
      console.error("Failed to generate structured TripPlan:\n", error);
      return this.createFallbackTripPlan(request);
    }
  }

  async close(): Promise<void> {
    await this.googleMapsToolProvider.close();
  }

  private createFallbackTripPlan(request: TripPlanRequest): TripPlan {
    return {
      city: request.city,
      start_date: request.start_date,
      end_date: request.end_date,
      days: this.createFallbackDays(request),
      weather_info: [],
      routes: [],
      overall_suggestions:
        "The planner could not return structured itinerary data.",
      budget: {
        total_attractions: 0,
        total_hotels: 0,
        total_meals: 0,
        total_transportation: 0,
        total: 0,
      },
    };
  }

  private ensureRouteConnections(
    plan: TripPlan,
    request: TripPlanRequest,
  ): TripPlan {
    const existingRoutes = plan.routes ?? [];
    const coveredDays = new Set(existingRoutes.map((r) => r.day_index));

    const generatedRoutes = plan.days.flatMap((day, index) => {
      if (coveredDays.has(index)) return [];
      return this.createRoutesForDay(day, index, request.transportation);
    });

    if (generatedRoutes.length === 0) return plan;

    return { ...plan, routes: [...existingRoutes, ...generatedRoutes] };
  }

  private createRoutesForDay(
    day: TripPlan["days"][number],
    dayIndex: number,
    requestTransportation: string,
  ): TripPlan["routes"] {
    const stops = this.getDayStops(day);
    if (stops.length < 2) return [];

    const transportation = day.transportation || requestTransportation;
    const routes: TripPlan["routes"] = [];

    for (let index = 0; index < stops.length - 1; index += 1) {
      const from = stops[index];
      const to = stops[index + 1];
      if (!from || !to) continue;

      routes.push({
        day_index: dayIndex,
        from,
        to,
        transportation,
        distance_text: "",
        duration_text: "",
        map_url: this.createGoogleMapsDirectionsUrl(from, to),
        notes:
          "Generated from itinerary stops. Google Maps can calculate the live route.",
      });
    }

    return routes;
  }

  private getDayStops(day: TripPlan["days"][number]): string[] {
    const hotelStop = this.formatStop(day.hotel?.name, day.hotel?.address);
    const attractionStops = day.attractions
      .map((attraction) => this.formatStop(attraction.name, attraction.address))
      .filter(Boolean);
    const stops = hotelStop
      ? [hotelStop, ...attractionStops, hotelStop]
      : attractionStops;

    return stops.filter(
      (stop, index) => index === 0 || stop !== stops[index - 1],
    );
  }

  private formatStop(name?: string, address?: string): string {
    const cleanName = name?.trim();
    const cleanAddress = address?.trim();

    if (!cleanName) return "";
    if (!cleanAddress || cleanAddress === cleanName) return cleanName;

    return `${cleanName}, ${cleanAddress}`;
  }

  private createGoogleMapsDirectionsUrl(from: string, to: string): string {
    return `https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
  }

  private createFallbackDays(request: TripPlanRequest): TripPlan["days"] {
    const startDate = new Date(`${request.start_date}T00:00:00.000Z`);

    return Array.from({ length: request.travel_days }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);

      return {
        date: date.toISOString().slice(0, 10),
        day_index: index,
        description: `Day ${index + 1} in ${request.city}`,
        transportation: request.transportation,
        accommodation: request.accommodation,
        attractions: [],
        meals: [],
      };
    });
  }
}
