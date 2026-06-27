import cors from "cors";
import express from "express";
import { createTripRouter } from "./api/routes/trip-routes";
import type { TripPlannerService } from "./services/trip-planner-service";

export type AppDependencies = {
  tripPlannerService: TripPlannerService;
  corsOrigins: string[];
};

export const createApp = ({
  tripPlannerService,
  corsOrigins,
}: AppDependencies) => {
  const app = express();

  app.use(
    cors({
      origin: corsOrigins,
    }),
  );

  app.use(
    express.json({
      type: [
        "application/json",
        "application/*+json",
        "application/x-www-form-urlencoded",
      ],
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "ai-trip-planner-api",
    });
  });

  app.use("/api/trip", createTripRouter({ tripPlannerService }));

  return app;
};
