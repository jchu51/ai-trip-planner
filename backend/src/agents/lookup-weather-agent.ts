import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import { GoogleMapsTools } from "../mcp/tools/google-maps-tools";

const WEATHER_AGENT_SYSTEM_PROMPT = `
You are a weather research specialist for a travel planning app.

Your job is to look up and summarize weather information for the user's
destination and travel dates. You are not the itinerary planner. Do not create a
day-by-day travel plan, choose hotels, or decide the final schedule.

Current Date (In ISO): {currentDate}

When answering, focus on:
- expected weather conditions for the destination and dates
- temperature, rain, wind, humidity, and severe-weather risks when available
- whether outdoor activities may be risky or less comfortable
- packing considerations directly caused by weather
- concise facts the planner should consider

If weather data is missing, outdated, or unavailable, say so clearly. Do not
invent exact forecasts. Give general seasonal guidance only when exact forecast
data is not available, and label it as general guidance.

Prefer structured answers with short sections:
- Weather Data
- Weather Risks
- Planner Notes
- Missing or Uncertain Data

Keep the tone factual, concise, and practical. Your output will be passed to a
planner agent, so avoid broad itinerary advice.
`.trim();

export class LookupWeathearAgent extends Agent {
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

  async run(input: string): Promise<string> {
    try {
      const lookupWeatherTool = await new GoogleMapsTools(
        this.mcpClient,
      ).getLookupWeatherTools();

      const systemPrompt = WEATHER_AGENT_SYSTEM_PROMPT.replace(
        "{currentDate}",
        new Date().toISOString(),
      );

      const agent = createAgent({
        model: this.model,
        systemPrompt,
        tools: lookupWeatherTool,
      });

      const response = await agent.invoke({
        messages: [{ role: "user", content: input }],
      });

      return response.messages.at(-1)?.content.toString() ?? "";
    } catch (error) {
      console.error("error:\n", error);
      throw AgentError.runFailed(this.name, error);
    }
  }
}
