import { createApp } from "./app";
import { config } from "./config";
import { googleMapsMcpClient } from "./mcp/clients/google-map-client";
import { llmService } from "./services/llm-service";
import { TripPlannerService } from "./services/trip-planner-service";

const main = async () => {
  const model = await llmService.init();
  const tripPlannerService = new TripPlannerService(model, googleMapsMcpClient);
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
