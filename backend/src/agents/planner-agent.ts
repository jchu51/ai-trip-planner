import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import { type TripPlan, tripPlanSchema } from "../domain/trip";
import { PLANNER_SYSTEM_PROMPT } from "../prompts/planner-system-prompt";
import {
  GoogleMapsToolProvider,
  GoogleToolsName,
} from "../mcp/tools/google-maps-tool-provider";

export class PlannerAgent extends Agent<TripPlan> {
  readonly model: ConfigurableModel;
  readonly googleMapsToolProvider: GoogleMapsToolProvider;
  readonly cacheCity?: string;

  constructor(
    name: string,
    model: ConfigurableModel,
    googleMapsToolProvider: GoogleMapsToolProvider,
    cacheCity?: string,
  ) {
    super(name);
    this.model = model;
    this.googleMapsToolProvider = googleMapsToolProvider;
    this.cacheCity = cacheCity;
  }

  async run(input: string): Promise<TripPlan> {
    try {
      const tools = await this.googleMapsToolProvider.getToolsByNames(
        [GoogleToolsName.COMPUTE_ROUTES, GoogleToolsName.RESOLVE_MAPS_URLS],
        this.cacheCity,
      );

      const agent = createAgent({
        model: this.model,
        systemPrompt: PLANNER_SYSTEM_PROMPT,
        tools,
        responseFormat: tripPlanSchema,
      });

      const response = await agent.invoke({
        messages: [{ role: "user", content: input }],
      });

      return tripPlanSchema.parse(response.structuredResponse);
    } catch (error) {
      console.error("error:\n", error);
      throw AgentError.runFailed(this.name, error);
    }
  }
}
