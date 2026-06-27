import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { isPromiseLike, type McpResultCache } from "./mcp-result-cache";

type McpTools = Awaited<ReturnType<MultiServerMCPClient["getTools"]>>;
type McpTool = McpTools[number];

export type GoogleMapsToolsOptions = {
  resultCache?: McpResultCache;
};

export enum GoogleToolsName {
  SEARCH_PLACES = "search_places",
  LOOKUP_WEATHER = "lookup_weather",
  COMPUTE_ROUTES = "compute_routes",
  RESOLVE_MAPS_URLS = "resolve_maps_urls",
  RESOLVE_NAMES = "resolve_names",
}

export class GoogleMapsTools {
  private static readonly toolsCacheByClient = new WeakMap<
    MultiServerMCPClient,
    Promise<McpTools>
  >();

  readonly client: MultiServerMCPClient;
  private readonly resultCache?: McpResultCache;
  private toolsCache?: McpTools;

  constructor(
    client: MultiServerMCPClient,
    options: GoogleMapsToolsOptions = {},
  ) {
    this.client = client;
    this.resultCache = options.resultCache;
  }

  async getAllTools(): Promise<McpTools> {
    this.toolsCache ??= await GoogleMapsTools.getCachedTools(this.client);

    return this.toolsCache;
  }

  clearCache(): void {
    this.toolsCache = undefined;
    GoogleMapsTools.toolsCacheByClient.delete(this.client);
  }

  async getToolsByNames(
    toolNames: GoogleToolsName | GoogleToolsName[],
    cacheCity?: string,
  ): Promise<McpTools> {
    const requestedToolNames = Array.isArray(toolNames)
      ? toolNames
      : [toolNames];
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

    return this.wrapToolsWithResultCache(matchingTools, cacheCity);
  }

  private filterToolsByNames(
    tools: McpTools,
    toolNames: GoogleToolsName[],
  ): McpTools {
    return tools.filter((tool) =>
      toolNames.some(
        (toolName) => tool.name === toolName || tool.name.endsWith(`_${toolName}`),
      ),
    );
  }

  private getMissingToolNames(
    tools: McpTools,
    toolNames: GoogleToolsName[],
  ): GoogleToolsName[] {
    return toolNames.filter(
      (toolName) =>
        !tools.some(
          (tool) => tool.name === toolName || tool.name.endsWith(`_${toolName}`),
        ),
    );
  }

  private formatToolNames(tools: McpTools): string {
    return tools.map((tool) => tool.name).join(", ") || "none";
  }

  private static getCachedTools(
    client: MultiServerMCPClient,
  ): Promise<McpTools> {
    const cachedTools = GoogleMapsTools.toolsCacheByClient.get(client);
    if (cachedTools) return cachedTools;

    const pendingTools = client.getTools().catch((error) => {
      GoogleMapsTools.toolsCacheByClient.delete(client);
      throw error;
    });

    GoogleMapsTools.toolsCacheByClient.set(client, pendingTools);

    return pendingTools;
  }

  private wrapToolsWithResultCache(tools: McpTools, cacheCity?: string): McpTools {
    const normalizedCity = this.normalizeCacheCity(cacheCity);
    if (!this.resultCache || !normalizedCity) return tools;

    return tools.map((tool) => this.createCachedTool(tool, normalizedCity));
  }

  private createCachedTool(tool: McpTool, normalizedCity: string): McpTool {
    return new DynamicStructuredTool({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      responseFormat: tool.responseFormat,
      defaultConfig: tool.defaultConfig,
      returnDirect: tool.returnDirect,
      verboseParsingErrors: tool.verboseParsingErrors,
      metadata: tool.metadata,
      extras: tool.extras,
      func: async (args, runManager, config) => {
        const cacheKey = this.createToolResultCacheKey(
          normalizedCity,
          tool.name,
          args,
        );
        const cacheLogLabel = this.createToolResultCacheLogLabel(
          normalizedCity,
          tool.name,
        );

        return this.resultCache!.getOrSet(
          cacheKey,
          () => {
            const result = tool.func(args, runManager, config);
            if (!isPromiseLike(result)) {
              throw new Error(
                `Cannot cache streaming MCP tool result for ${tool.name}.`,
              );
            }

            return result;
          },
          { label: cacheLogLabel, key: cacheKey },
        );
      },
    });
  }

  private normalizeCacheCity(city?: string): string {
    return city?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  }

  private createToolResultCacheKey(
    normalizedCity: string,
    toolName: string,
    args: unknown,
  ): string {
    return [
      "google-maps",
      normalizedCity,
      toolName,
      this.stableStringify(args),
    ].join(":");
  }

  private createToolResultCacheLogLabel(
    normalizedCity: string,
    toolName: string,
  ): string {
    return `${this.normalizeToolName(toolName)} ${this.formatCityForLog(normalizedCity)}`;
  }

  private normalizeToolName(toolName: string): string {
    return (
      Object.values(GoogleToolsName).find((name) => toolName.includes(name)) ??
      toolName
    );
  }

  private formatCityForLog(normalizedCity: string): string {
    return normalizedCity
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }

    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, item]) => `${JSON.stringify(key)}:${this.stableStringify(item)}`,
      )
      .join(",")}}`;
  }
}
