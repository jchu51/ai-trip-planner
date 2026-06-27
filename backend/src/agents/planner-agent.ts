import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import { type TripPlan, tripPlanSchema } from "../domain/trip";
import { PLANNER_SYSTEM_PROMPT } from "../prompts/planner-system-prompt";

export class PlannerAgent extends Agent<TripPlan> {
  readonly model: ConfigurableModel;

  constructor(name: string, model: ConfigurableModel) {
    super(name);
    this.model = model;
  }

  async run(input: string): Promise<TripPlan> {
    try {
      const agent = createAgent({
        model: this.model,
        systemPrompt: PLANNER_SYSTEM_PROMPT,
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
