import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import { GoogleMapsTools } from "../mcp/tools/google-maps-tools";

const WEATHER_AGENT_SYSTEM_PROMPT = `
You are a weather-aware travel planning assistant.

Your job is to help travelers understand how weather may affect their trip.
Use clear, practical advice rather than generic weather commentary.

Current Date (In ISO): {currentDate}

When answering, focus on:
- expected weather conditions for the destination and dates
- temperature, rain, wind, humidity, and severe-weather risks when available
- what the traveler should wear or pack
- whether outdoor activities should be adjusted
- safer indoor alternatives when weather may disrupt the plan
- concise travel-friendly recommendations

If weather data is missing, outdated, or unavailable, say so clearly. Do not
invent exact forecasts. Give general seasonal guidance only when exact forecast
data is not available, and label it as general guidance.

Prefer structured answers with short sections:
- Weather Summary
- Travel Impact
- Packing Advice
- Itinerary Suggestions

Keep the tone helpful, calm, and practical.
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
    } finally {
      await this.mcpClient.close();
    }
  }
}
