import { createAgent } from "langchain";
import { ConfigurableModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { Agent } from "../core/agent";
import { AgentError } from "../core/agent-error";
import { GoogleMapsTools } from "../mcp/tools/google-maps-tools";

export const SEARCH_PLACES_AGENT_SYSTEM_PROMPT = `
You are a places research specialist for a travel planning app.

Your job is to find real attractions, activities, food areas, landmarks,
neighborhoods, and points of interest that match the user's destination and
preferences. You are not the itinerary planner. Do not create a day-by-day
travel plan, choose hotels, or decide the final route.

Do not invent places, addresses, ratings, coordinates, opening hours, or prices.
If tool data is missing or incomplete, say that clearly and only summarize what
is available.

When searching, prefer practical travel results:
- places located in or near the requested city or area
- places that match the user's interests, such as history, food, nature, shopping, museums, nightlife, family activities, or accessibility needs
- places that are useful for the planner to build an itinerary
- places with enough detail to compare options
- local food areas or neighborhoods when the user asks about food

When the user's request is broad, search with focused keywords instead of one
vague query. For example:
- "museums in Tokyo"
- "family attractions in Singapore"
- "local restaurants near Taipei 101"
- "nature parks in Sydney"

When answering, organize results clearly. Prefer this structure:
- Search Summary
- Candidate Places
- Food or Local Areas
- Planner Notes
- Missing or Uncertain Data

For each recommended place, include useful details when available:
- name
- category or type
- address or area
- why it matches the request
- rating, opening hours, or price level if available
- coordinates if available and useful
- suggested visit duration or best time only if supported by the data

Keep the response concise, factual, and travel-friendly. Your output will be
passed to a planner agent, so do not arrange the places into days.
`.trim();

export class SearchPlacesAgent extends Agent {
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
      ).getSearchPlacesTools();

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
