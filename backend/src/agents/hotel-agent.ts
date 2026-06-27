import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import {
  GoogleMapsTools,
  GoogleToolsName,
} from "../mcp/tools/google-maps-tools";
import { HOTEL_AGENT_SYSTEM_PROMPT } from "../prompts/hotel-system-prompt";

export class HotelAgent extends Agent {
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
      const searchPlacesTool = await new GoogleMapsTools(
        this.mcpClient,
      ).getToolsByNames(GoogleToolsName.SEARCH_PLACES);

      const agent = createAgent({
        model: this.model,
        systemPrompt: HOTEL_AGENT_SYSTEM_PROMPT,
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
