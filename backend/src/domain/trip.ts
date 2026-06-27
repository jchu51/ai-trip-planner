import { z } from "zod";

export const tripPlanRequestSchema = z
  .object({
    city: z.string().min(1, "city is required"),
    start_date: z.string().date("start_date must be a valid date (YYYY-MM-DD)"),
    end_date: z.string().date("end_date must be a valid date (YYYY-MM-DD)"),
    travel_days: z.coerce.number().int().positive(),
    transportation: z.string().min(1, "transportation is required"),
    accommodation: z.string().min(1, "accommodation is required"),
    preferences: z.array(z.string()).default([]),
    free_text_input: z.string().optional().default(""),
  })
  .refine((data) => new Date(data.start_date) < new Date(data.end_date), {
    message: "end_date must be after start_date",
    path: ["end_date"],
  });

export type TripPlanRequestBody = z.infer<typeof tripPlanRequestSchema>;
export type TripPlanRequest = TripPlanRequestBody;

const locationSchema = z.object({
  longitude: z.coerce.number(),
  latitude: z.coerce.number(),
});

const attractionSchema = z.object({
  name: z.string(),
  address: z.string().default(""),
  location: locationSchema.default({ longitude: 0, latitude: 0 }),
  visit_duration: z.coerce.number().int().default(120),
  description: z.string().default(""),
  category: z.string().optional().default("Attraction"),
  rating: z.coerce.number().optional(),
  image_url: z.string().optional(),
  ticket_price: z.coerce.number().int().optional().default(0),
});

const mealSchema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string(),
  address: z.string().optional(),
  location: locationSchema.optional(),
  description: z.string().optional(),
  estimated_cost: z.coerce.number().int().optional().default(0),
});

const hotelSchema = z.object({
  name: z.string(),
  address: z.string().default(""),
  location: locationSchema.optional(),
  price_range: z.string().default(""),
  rating: z.coerce.number().optional(),
  distance: z.string().default(""),
  type: z.string().default(""),
  estimated_cost: z.coerce.number().int().optional().default(0),
});

const dayPlanSchema = z.object({
  date: z.string(),
  day_index: z.coerce.number().int(),
  description: z.string(),
  transportation: z.string(),
  accommodation: z.string(),
  hotel: hotelSchema.optional(),
  attractions: z.array(attractionSchema).default([]),
  meals: z.array(mealSchema).default([]),
});

const weatherInfoSchema = z.object({
  date: z.string(),
  day_weather: z.string().default(""),
  night_weather: z.string().default(""),
  day_temp: z.coerce.number().int().default(0),
  night_temp: z.coerce.number().int().default(0),
  wind_direction: z.string().default(""),
  wind_power: z.string().default(""),
});

const routeConnectionSchema = z.object({
  day_index: z.coerce
    .number()
    .int()
    .describe("Zero-based day index matching the day_index in days."),
  from: z
    .string()
    .describe("Starting hotel, attraction, restaurant, station, or area name."),
  to: z
    .string()
    .describe("Next hotel, attraction, restaurant, station, or area name."),
  transportation: z
    .string()
    .describe("Travel mode, such as Walk, Public transit, Drive, or Bike.")
    .default(""),
  distance_text: z
    .string()
    .describe("Human-readable route distance from the map tool, if available.")
    .default(""),
  duration_text: z
    .string()
    .describe("Human-readable route duration from the map tool, if available.")
    .default(""),
  map_url: z
    .string()
    .describe("Google Maps directions URL for this connection, if available.")
    .optional()
    .default(""),
  notes: z
    .string()
    .describe("Short practical route note for the traveler or planner.")
    .optional()
    .default(""),
});

const budgetSchema = z.object({
  total_attractions: z.coerce.number().int().default(0),
  total_hotels: z.coerce.number().int().default(0),
  total_meals: z.coerce.number().int().default(0),
  total_transportation: z.coerce.number().int().default(0),
  total: z.coerce.number().int().default(0),
});

export const tripPlanSchema = z.object({
  city: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  days: z.array(dayPlanSchema),
  weather_info: z.array(weatherInfoSchema).default([]),
  routes: z
    .array(routeConnectionSchema)
    .describe(
      "Frontend map route connections. Use [] only when there are fewer than two known stops in the whole itinerary.",
    )
    .default([]),
  overall_suggestions: z.string(),
  budget: budgetSchema.default({
    total_attractions: 0,
    total_hotels: 0,
    total_meals: 0,
    total_transportation: 0,
    total: 0,
  }),
});

export type TripPlan = z.infer<typeof tripPlanSchema>;
