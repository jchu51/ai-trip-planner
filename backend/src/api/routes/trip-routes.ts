import { Router } from "express";
import { ZodError } from "zod";
import { tripPlanRequestSchema } from "../../domain/trip";
import type { TripPlannerService } from "../../services/trip-planner-service";

export type TripRoutesDependencies = {
  tripPlannerService: TripPlannerService;
};

export const createTripRouter = ({
  tripPlannerService,
}: TripRoutesDependencies): Router => {
  const tripRouter = Router();

  tripRouter.post("/plan", async (req, res) => {
    try {
      const request = tripPlanRequestSchema.parse(req.body);
      const result = await tripPlannerService.planTrip(request);

      res.status(200).json({
        success: true,
        message: "Trip plan generated successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid trip plan request",
          errors: error.issues,
        });
        return;
      }

      console.error("Failed to generate trip plan:\n", error);

      res.status(500).json({
        success: false,
        message: "Failed to generate trip plan",
      });
    }
  });

  return tripRouter;
};
