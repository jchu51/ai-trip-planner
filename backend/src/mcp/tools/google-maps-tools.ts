import type { MultiServerMCPClient } from "@langchain/mcp-adapters";

type McpTools = Awaited<ReturnType<MultiServerMCPClient["getTools"]>>;

export enum GoogleToolsName {
  SEARCH_PLACES = "search_places",
  LOOKUP_WEATHER = "lookup_weather",
}

export class GoogleMapsTools {
  readonly client: MultiServerMCPClient;
  private toolsCache?: McpTools;

  constructor(client: MultiServerMCPClient) {
    this.client = client;
  }

  async getAllTools(): Promise<McpTools> {
    this.toolsCache ??= await this.client.getTools();

    // console.dir(
    //   this.toolsCache.map((tool) => ({
    //     name: tool.name,
    //     description: tool.description,
    //     schema: tool.schema,
    //   })),
    //   { depth: null },
    // );

    return this.toolsCache;
  }

  clearCache(): void {
    this.toolsCache = undefined;
  }

  async getLookupWeatherTools(): Promise<McpTools> {
    return this.getToolsByName(GoogleToolsName.LOOKUP_WEATHER);
  }

  async getSearchPlacesTools(): Promise<McpTools> {
    return this.getToolsByName(GoogleToolsName.SEARCH_PLACES);
  }

  private async getToolsByName(toolName: GoogleToolsName): Promise<McpTools> {
    let tools = await this.getAllTools();
    let matchingTools = this.filterToolsByName(tools, toolName);

    if (matchingTools.length === 0) {
      this.clearCache();
      tools = await this.getAllTools();
      matchingTools = this.filterToolsByName(tools, toolName);
    }

    if (matchingTools.length === 0) {
      throw new Error(
        `${toolName} tool not found. Available tools: ${this.formatToolNames(tools)}`,
      );
    }

    return matchingTools;
  }

  private filterToolsByName(
    tools: McpTools,
    toolName: GoogleToolsName,
  ): McpTools {
    return tools.filter((tool) => tool.name.includes(toolName));
  }

  private formatToolNames(tools: McpTools): string {
    return tools.map((tool) => tool.name).join(", ") || "none";
  }
}
