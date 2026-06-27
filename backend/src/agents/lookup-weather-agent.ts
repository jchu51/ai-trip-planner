import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import {
  GoogleMapsToolProvider,
  GoogleToolsName,
} from "../mcp/tools/google-maps-tool-provider";
import { WEATHER_AGENT_SYSTEM_PROMPT } from "../prompts/weather-system-prompt";

export class LookupWeatherAgent extends Agent {
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

  async run(input: string): Promise<string> {
    try {
      const lookupWeatherTool =
        await this.googleMapsToolProvider.getToolsByNames(
          GoogleToolsName.LOOKUP_WEATHER,
          this.cacheCity,
        );

      const agent = createAgent({
        model: this.model,
        systemPrompt: WEATHER_AGENT_SYSTEM_PROMPT,
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
