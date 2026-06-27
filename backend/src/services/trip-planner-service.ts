import type { ConfigurableModel } from "langchain/chat_models/universal";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  HotelAgent,
  LookupWeatherAgent,
  PlannerAgent,
  SearchPlacesAgent,
} from "../agents";
import { type TripPlan, type TripPlanRequest } from "../domain/trip";
import { buildTripUserPrompt } from "../prompts/trip-user-prompt";

export class TripPlannerService {
  private model: ConfigurableModel;
  private mcpClient: MultiServerMCPClient;

  constructor(model: ConfigurableModel, mcpClient: MultiServerMCPClient) {
    this.model = model;
    this.mcpClient = mcpClient;
  }

  async planTrip(request: TripPlanRequest): Promise<TripPlan> {
    const userPrompt = buildTripUserPrompt(request);

    const weatherAgent = new LookupWeatherAgent(
      "lookupWeatherAgent",
      this.model,
      this.mcpClient,
    );

    const searchPlacesAgent = new SearchPlacesAgent(
      "searchPlacesAgent",
      this.model,
      this.mcpClient,
    );
    const hotelAgent = new HotelAgent("hotelAgent", this.model, this.mcpClient);
    const plannerAgent = new PlannerAgent(
      "plannerAgent",
      this.model,
      this.mcpClient,
    );

    const [weather, places, hotels] = await Promise.all([
      weatherAgent.run(userPrompt),
      searchPlacesAgent.run(userPrompt),
      hotelAgent.run(userPrompt),
    ]);

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
    await this.mcpClient.close();
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
    const daysWithExistingRoutes = new Set(
      existingRoutes.map((route) => this.normalizeDayIndex(route.day_index)),
    );
    const generatedRoutes = plan.days.flatMap((day, index) => {
      const dayIndex = this.normalizeDayIndex(day.day_index, index);
      if (daysWithExistingRoutes.has(dayIndex)) return [];

      return this.createRoutesForDay(day, dayIndex, request.transportation);
    });

    if (generatedRoutes.length === 0) return plan;

    return {
      ...plan,
      routes: [...existingRoutes, ...generatedRoutes],
    };
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

  private normalizeDayIndex(dayIndex: number, fallback = 0): number {
    return dayIndex > 0 ? dayIndex - 1 : (dayIndex ?? fallback);
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
