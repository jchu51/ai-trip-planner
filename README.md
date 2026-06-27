# AI Trip Planner

AI Trip Planner is an intelligent travel assistant inspired by Chapter 13 of
[HelloAgents](https://datawhalechina.github.io/hello-agents/#/./chapter13/%E7%AC%AC%E5%8D%81%E4%B8%89%E7%AB%A0%20%E6%99%BA%E8%83%BD%E6%97%85%E8%A1%8C%E5%8A%A9%E6%89%8B).

## Project Goal

AI Trip Planner helps users create, edit, visualize, budget, and export complete
trip plans.

A user should be able to provide:

- destination
- travel dates
- travel style
- budget level
- food preferences
- hotel preferences
- must-see places

Then the system should generate a complete itinerary with attractions,
restaurants, hotels, routes, cost estimates, and editable schedule details.

## Core Features

### 1. Intelligent Itinerary Planning

The assistant should generate a full travel plan from user input.

The itinerary may include:

- daily schedule
- attractions
- restaurants
- hotel suggestions
- travel time between places
- user preferences and constraints

Example request:

```text
Plan a 3-day trip to Kyoto for two people. We like temples, local food, and a
medium budget.
```

Expected output:

```text
Day 1: Arrival, hotel check-in, Nishiki Market, Gion walk
Day 2: Fushimi Inari, Kiyomizu-dera, local dinner
Day 3: Arashiyama, bamboo forest, departure
```

### 2. Map Visualization

The app should display the itinerary on a map.

Planned map features:

- mark attraction locations
- show hotel location
- show restaurants
- draw routes between stops
- group locations by day
- visually update when the itinerary changes

### 3. Budget Calculation

The assistant should estimate and explain trip costs.

Budget categories:

- attraction tickets
- hotel
- food
- local transportation
- optional activities

Example budget output:

```text
Hotel: $360
Food: $180
Tickets: $70
Transport: $45
Estimated total: $655
```

### 4. Itinerary Editing

Users should be able to modify the generated plan.

Editing actions:

- add an attraction
- remove an attraction
- reorder stops
- change travel day
- update meal or hotel choices
- recalculate route and budget after edits

The map and budget should update when the plan changes.

### 5. Export

The app should support exporting the final itinerary.

Planned export formats:

- PDF
- image

This makes the itinerary easier to save, print, or share.

## Frontend

The React frontend lives in `frontend/`. It ports the Chapter 13 Vue frontend
flow into a Vite + React app:

- trip request form with destination, dates, travel style, hotel preference,
  preference tags, and free-text requirements
- loading progress while the backend generates a plan
- session-stored result page that reuses the backend's Python-compatible
  `TripPlan` response shape
- editable daily attractions with reorder, delete, and field edits
- budget, weather, hotel, meal, and day-by-day itinerary sections
- Google Maps route visualization built with `@react-google-maps/api`
- export to PNG or PDF

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

By default the frontend calls `http://127.0.0.1:8000`. Override this with
`VITE_API_BASE_URL` when the backend is running somewhere else.

To render the Google route map, create `frontend/.env` from
`frontend/.env.example` and set `VITE_GOOGLE_MAPS_API_KEY`. Use a browser API
key restricted by HTTP referrer, for example:

```text
http://localhost:3000/*
http://127.0.0.1:3000/*
https://your-production-domain.com/*
```

For this frontend browser key, enable and allow only the APIs needed by the map
renderer:

- Maps JavaScript API (`maps-backend.googleapis.com`)
- Directions API (Legacy) (`directions-backend.googleapis.com`)

The React map uses `@react-google-maps/api` and `DirectionsService`, so
`ZERO_RESULTS` can still happen for a specific route leg when Google cannot
match the stop text or travel mode. Failed legs are marked in the route editor
with a red `x` badge. The old `VITE_GOOGLE_MAPS_EMBED_API_KEY` variable was for
iframe embeds and is not used by the React Google Maps route renderer.

## Backend

The backend is a TypeScript/LangChain learning implementation for building
small, focused agents around Google Maps MCP tools. The current backend uses a
specialist-agent pipeline followed by one planner agent.

Current backend pieces:

- `LookupWeatherAgent`: gathers weather facts and weather risks only.
- `SearchPlacesAgent`: gathers attractions, food areas, activities, and places
  worth visiting.
- `HotelAgent`: gathers hotel options and hotel-area tradeoffs based on the
  user's accommodation preference.
- `PlannerAgent`: acts as the final planning brain. It receives the specialist
  outputs and writes the final day-by-day itinerary.
- `GoogleMapsTools`: loads Google Maps MCP tools and selects the tools each
  agent is allowed to use.
- `AgentError`: shared agent-level error type that keeps the original cause for
  debugging.

The current design separates research from planning:

```text
User prompt
  -> Weather Agent + lookup_weather
  -> Places Agent + search_places
  -> Hotel Agent + search_places
  -> Planner Agent
  -> final day-by-day itinerary
```

The three specialist agents do not plan the trip. Their prompts are intentionally
scoped so they return factual, useful planning inputs. The planner agent is the
only agent responsible for combining those inputs into the final itinerary.

The MCP client connects to Google Maps over HTTP. Agents do not receive every
tool automatically; each agent receives only the tool group it needs. For
example, the weather agent receives `lookup_weather`, while the places agent
receives `search_places`.

### Backend Structure

```text
backend/src/
  app.ts                         # builds and exports the Express app
  server.ts                      # starts the HTTP server and handles shutdown
  api/
    routes/                      # Express route modules
  domain/                        # shared trip schemas and domain types
  agents/                        # focused LangChain agent classes
  prompts/                       # system prompts and user prompt builders
  examples/                      # local CLI/demo runners
  mcp/
    clients/                     # MCP client setup
    tools/                       # MCP tool selection helpers
  services/                      # orchestration and LLM services
```

`src/app.ts` is intentionally separate from `src/server.ts` so the Express app
can be imported without opening a port. That makes testing and future serverless
or worker-style entry points easier.

### Agent Flow

The sample backend app currently runs the independent specialist agents in
parallel:

```ts
const [weather, places, hotels] = await Promise.all([
  weatherAgent.run(userPrompt),
  searchPlacesAgent.run(userPrompt),
  hotelAgent.run(userPrompt),
]);
```

Then the outputs are passed to the planner:

```text
Original user request:
...

Weather agent output:
...

Search places agent output:
...

Hotel agent output:
...
```

This keeps the architecture easy to understand while reducing latency compared
with calling the three specialists one after another.

### Latency Notes

Four agents means four LLM calls, plus MCP tool calls. The main latency controls
are:

- run independent specialist agents in parallel
- keep specialist outputs concise
- use a faster model for specialist research agents
- reserve the stronger model for the planner agent
- cache MCP tool discovery instead of calling `getTools()` repeatedly
- close the shared MCP client after the full pipeline finishes

### Backend Setup

Create `backend/.env` from `backend/.env.example` and provide:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
LLM_MODEL_ID=
LLM_API_KEY=
LLM_TIMEOUT=60
GOOGLE_API_KEY=
GOOGLE_MCP_URL=https://mapstools.googleapis.com/mcp
```

Use a separate Google server API key for `GOOGLE_API_KEY`. This key is sent from
the backend to the Google Maps MCP endpoint and should not be exposed to the
browser. In Google Cloud, give it API restrictions for the Maps MCP tools used by
the agents:

```yaml
apiTargets:
  - service: addressvalidation.googleapis.com
  - service: geocoding-backend.googleapis.com
  - service: geolocation.googleapis.com
  - service: mapmanagement.googleapis.com
  - service: elevation-backend.googleapis.com
  - service: maps-embed-backend.googleapis.com
  - service: mapstools.googleapis.com
  - service: maps-backend.googleapis.com
  - service: places.googleapis.com
  - service: placewidgets.googleapis.com
  - service: routes.googleapis.com
  - service: weather.googleapis.com
  - service: directions-backend.googleapis.com
```

For application restrictions, prefer restricting the backend key to your server
egress IPs in production. During local development, you may need to temporarily
leave the application restriction open if your local IP changes often, but keep
the API restrictions above enabled.

Optional LangSmith tracing variables are also included in the example env file.
By default, local development allows the Vite frontend running on
`localhost:3000` to call the backend API. For deployed environments, set
`NODE_ENV=production`, change `CORS_ORIGINS` to the real frontend origin, and set
`HOST=0.0.0.0` if the server must accept external traffic.

Install and run:

```bash
cd backend
npm install
npm start
```

Run with hot reload during development:

```bash
cd backend
npm run dev
```

The API server listens on `http://127.0.0.1:8000` by default.

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Generate a trip plan:

```bash
curl 'http://127.0.0.1:8000/api/trip/plan' \
  --data-raw '{"city":"Taipei","start_date":"2026-06-01","end_date":"2026-06-03","travel_days":3,"transportation":"public transit","accommodation":"economy hotel","preferences":["temples","local food"],"free_text_input":""}'
```

The endpoint runs the weather, places, and hotel specialist agents first, then
passes their outputs into the planner agent. The response matches the original
Python frontend contract:

```ts
{
  success: boolean;
  message: string;
  data?: TripPlan;
}
```

Request body:

```ts
{
  city: string;
  start_date: string;
  end_date: string;
  travel_days: number;
  transportation: string;
  accommodation: string;
  preferences: string[];
  free_text_input?: string;
}
```

`PlannerAgent` uses LangChain `responseFormat` with the shared `TripPlan` Zod
schema, so the planner should return structured data instead of free-form JSON
text. The returned `data` object is shaped for the existing frontend:

```ts
{
  city: string;
  start_date: string;
  end_date: string;
  days: DayPlan[];
  weather_info: WeatherInfo[];
  routes: RouteConnection[];
  overall_suggestions: string;
  budget?: Budget;
}
```

`routes` contains planner-selected Google route connections for the map section,
including origin, destination, transport mode, distance, duration, and map URL
when available.

Run the local CLI example without starting the HTTP server:

```bash
cd backend
npm run example
```

Type-check:

```bash
cd backend
npx tsc --noEmit
```
