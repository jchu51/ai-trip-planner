import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import { type TripPlan, tripPlanSchema } from "../domain/trip";
import { PLANNER_SYSTEM_PROMPT } from "../prompts/planner-system-prompt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  GoogleMapsTools,
  GoogleToolsName,
} from "../mcp/tools/google-maps-tools";

export class PlannerAgent extends Agent<TripPlan> {
  readonly model: ConfigurableModel;
  readonly mcpClient: MultiServerMCPClient;

  constructor(
    name: string,
    model: ConfigurableModel,
    mcpClient: MultiServerMCPClient,
  ) {
    super(name);
    this.model = model;
    this.mcpClient = mcpClient;
  }

  async run(input: string): Promise<TripPlan> {
    try {
      const tools = await new GoogleMapsTools(this.mcpClient).getToolsByNames([
        GoogleToolsName.COMPUTE_ROUTES,
        GoogleToolsName.RESOLVE_MAPS_URLS,
      ]);

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
