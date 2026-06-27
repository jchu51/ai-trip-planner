import type { ConfigurableModel } from "langchain/chat_models/universal";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  HotelAgent,
  LookupWeathearAgent,
  PlannerAgent,
  SearchPlacesAgent,
} from "../agents";
import {
  type TripPlan,
  type TripPlanRequest,
} from "../domain/trip";
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

    const weatherAgent = new LookupWeathearAgent(
      "lookupWeatherAgent",
      this.model,
      this.mcpClient,
    );

    const searchPlacesAgent = new SearchPlacesAgent(
      "searchPlacesAgent",
      this.model,
      this.mcpClient,
    );
    const hotelAgent = new HotelAgent(
      "hotelAgent",
      this.model,
      this.mcpClient,
    );
    const plannerAgent = new PlannerAgent("plannerAgent", this.model);

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
      return await plannerAgent.run(plannerInput);
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
