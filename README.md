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

## Backend

The backend is a TypeScript/LangChain learning implementation for building
small, focused agents around Google Maps MCP tools. The current backend uses a
specialist-agent pipeline followed by one planner agent.

Current backend pieces:

- `LookupWeathearAgent`: gathers weather facts and weather risks only.
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
LLM_MODEL_ID=
LLM_API_KEY=
LLM_TIMEOUT=60
GOOGLE_API_KEY=
GOOGLE_MCP_URL=https://mapstools.googleapis.com/mcp
```

Optional LangSmith tracing variables are also included in the example env file.

Install and run:

```bash
cd backend
npm install
npm start
```

Type-check:

```bash
cd backend
npx tsc --noEmit
```
