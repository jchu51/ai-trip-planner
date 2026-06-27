import { createApp } from "./app";
import { config } from "./config";
import { createGoogleMapsMcpClient } from "./mcp/clients/google-map-client";
import { GoogleMapsToolProvider } from "./mcp/tools/google-maps-tool-provider";
import { McpResultCache } from "./mcp/tools/mcp-result-cache";
import { llmService } from "./services/llm-service";
import { TripPlannerService } from "./services/trip-planner-service";

const main = async () => {
  const model = await llmService.init();
  const googleMapsMcpClient = createGoogleMapsMcpClient();
  const mcpResultCache = new McpResultCache();

  const googleMapsToolProvider = new GoogleMapsToolProvider(
    googleMapsMcpClient,
    mcpResultCache,
  );

  const tripPlannerService = new TripPlannerService(
    model,
    googleMapsToolProvider,
  );
  const app = createApp({
    tripPlannerService,
    corsOrigins: config.server.corsOrigins,
  });

  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(
      `AI Trip Planner API listening on http://${config.server.host}:${config.server.port}`,
    );
  });

  const shutdown = () => {
    const forceExit = setTimeout(() => {
      console.error("Shutdown timed out — forcing exit");
      process.exit(1);
    }, 30_000);
    forceExit.unref();

    server.close(() => {
      void tripPlannerService.close().finally(() => {
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
