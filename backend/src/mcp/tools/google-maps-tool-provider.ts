import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { GoogleMapsTools, GoogleToolsName } from "./google-maps-tools";
import { McpResultCache } from "./mcp-result-cache";

type McpTools = Awaited<ReturnType<MultiServerMCPClient["getTools"]>>;

export { GoogleToolsName };

export class GoogleMapsToolProvider {
  private readonly tools: GoogleMapsTools;

  constructor(client: MultiServerMCPClient, resultCache: McpResultCache) {
    this.tools = new GoogleMapsTools(client, { resultCache });
  }

  async getToolsByNames(
    toolNames: GoogleToolsName | GoogleToolsName[],
    cacheCity?: string,
  ): Promise<McpTools> {
    return this.tools.getToolsByNames(toolNames, cacheCity);
  }

  async close(): Promise<void> {
    await this.tools.client.close();
  }
}
