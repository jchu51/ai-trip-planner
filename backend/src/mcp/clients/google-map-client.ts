import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { config } from "../../config";

export const googleMapsMcpClient = new MultiServerMCPClient({
  google: {
    transport: config.google.mcpTransport,
    url: config.google.mcpUrl,
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "X-Goog-Api-Key": config.google.apiKey,
    },
  },
});
