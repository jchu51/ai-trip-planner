import { z } from "zod";

export const tripPlanRequestSchema = z.object({
  city: z.string().min(1, "city is required"),
  start_date: z.string().min(1, "start_date is required"),
  end_date: z.string().min(1, "end_date is required"),
  travel_days: z.coerce.number().int().positive(),
  transportation: z.string().min(1, "transportation is required"),
  accommodation: z.string().min(1, "accommodation is required"),
  preferences: z.array(z.string()).default([]),
  free_text_input: z.string().optional().default(""),
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
  category: z.string().optional().default("景点"),
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
  rating: z.string().default(""),
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
  overall_suggestions: z.string(),
  budget: budgetSchema.optional(),
});

export type TripPlan = z.infer<typeof tripPlanSchema>;
