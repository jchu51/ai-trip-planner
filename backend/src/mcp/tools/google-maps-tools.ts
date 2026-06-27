import type { MultiServerMCPClient } from "@langchain/mcp-adapters";

type McpTools = Awaited<ReturnType<MultiServerMCPClient["getTools"]>>;

export enum GoogleToolsName {
  SEARCH_PLACES = "search_places",
  LOOKUP_WEATHER = "lookup_weather",
  COMPUTE_ROUTES = "compute_routes",
  RESOLVE_MAPS_URLS = "resolve_maps_urls",
  RESOLVE_NAMES = "resolve_names",
}

export class GoogleMapsTools {
  readonly client: MultiServerMCPClient;
  private toolsCache?: McpTools;

  constructor(client: MultiServerMCPClient) {
    this.client = client;
  }

  async getAllTools(): Promise<McpTools> {
    this.toolsCache ??= await this.client.getTools();

    return this.toolsCache;
  }

  clearCache(): void {
    this.toolsCache = undefined;
  }

  async getToolsByNames(
    toolNames: GoogleToolsName | GoogleToolsName[],
  ): Promise<McpTools> {
    const requestedToolNames = Array.isArray(toolNames) ? toolNames : [toolNames];
    let tools = await this.getAllTools();
    let matchingTools = this.filterToolsByNames(tools, requestedToolNames);
    let missingToolNames = this.getMissingToolNames(tools, requestedToolNames);

    if (missingToolNames.length > 0) {
      this.clearCache();
      tools = await this.getAllTools();
      matchingTools = this.filterToolsByNames(tools, requestedToolNames);
      missingToolNames = this.getMissingToolNames(tools, requestedToolNames);
    }

    if (missingToolNames.length > 0) {
      throw new Error(
        `${missingToolNames.join(", ")} tool not found. Available tools: ${this.formatToolNames(tools)}`,
      );
    }

    return matchingTools;
  }

  private filterToolsByNames(
    tools: McpTools,
    toolNames: GoogleToolsName[],
  ): McpTools {
    return tools.filter((tool) =>
      toolNames.some((toolName) => tool.name.includes(toolName)),
    );
  }

  private getMissingToolNames(
    tools: McpTools,
    toolNames: GoogleToolsName[],
  ): GoogleToolsName[] {
    return toolNames.filter(
      (toolName) => !tools.some((tool) => tool.name.includes(toolName)),
    );
  }

  private formatToolNames(tools: McpTools): string {
    return tools.map((tool) => tool.name).join(", ") || "none";
  }
}
