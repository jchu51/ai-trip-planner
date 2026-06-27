import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import {
  GoogleMapsToolProvider,
  GoogleToolsName,
} from "../mcp/tools/google-maps-tool-provider";
import { SEARCH_PLACES_AGENT_SYSTEM_PROMPT } from "../prompts/places-system-prompt";

export class SearchPlacesAgent extends Agent {
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
      const searchPlacesTool =
        await this.googleMapsToolProvider.getToolsByNames(
          GoogleToolsName.SEARCH_PLACES,
          this.cacheCity,
        );

      const agent = createAgent({
        model: this.model,
        systemPrompt: SEARCH_PLACES_AGENT_SYSTEM_PROMPT,
        tools: searchPlacesTool,
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
