# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Trip Planner is a full-stack travel assistant that uses a multi-agent LLM pipeline (LangChain + Anthropic) with Google Maps MCP tools to generate complete trip itineraries. The backend runs specialist agents in parallel and feeds their outputs to a final planner agent that returns structured data.

## Commands

### Backend

```bash
cd backend
npm install
npm run dev        # Development with hot reload
npm start          # Production
npm run example    # CLI demo (no HTTP server)
npx tsc --noEmit   # Type-check only
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Dev server at http://127.0.0.1:3000
npm run build      # Production build
npm run preview    # Preview production build
```

### Testing the API

```bash
curl http://127.0.0.1:8000/health

curl 'http://127.0.0.1:8000/api/trip/plan' \
  --data-raw '{"city":"Taipei","start_date":"2026-06-01","end_date":"2026-06-03","travel_days":3,"transportation":"public transit","accommodation":"economy hotel","preferences":["temples","local food"],"free_text_input":""}'
```

## Environment Setup

**Backend** (`backend/.env`): `LLM_MODEL_ID`, `LLM_API_KEY`, `GOOGLE_API_KEY` (server-side), `GOOGLE_MCP_URL`, `CORS_ORIGINS`. Optional: `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGCHAIN_PROJECT`.

**Frontend** (`frontend/.env`): `VITE_GOOGLE_MAPS_API_KEY` (browser-restricted key), `VITE_API_BASE_URL`.

The backend key accesses Google Maps via MCP. The frontend key is a separate browser-restricted key (HTTP referrer) that must have Maps JavaScript API and Directions API (Legacy) enabled.

## Architecture

### Backend Agent Pipeline

```
User Request (POST /api/trip/plan)
    ↓
[Parallel] LookupWeatherAgent | SearchPlacesAgent | HotelAgent
    ↓ combined text summaries
PlannerAgent → Zod-validated TripPlan
    ↓
JSON response
```

- All agents extend `Agent<Output>` (`src/core/agent.ts`) and use LangChain's `createAgent` from `langchain`
- Specialist agents use a faster model; the planner can use a stronger model (controlled by env)
- MCP tools are scoped per agent: weather agent only gets `lookup_weather`, places agents only get `search_places`, planner gets `compute_routes` + `resolve_maps_urls`
- The MCP client is shared across agents and created/closed once per request in `trip-planner-service.ts`
- MCP results are cached at two levels: tool discovery (`google-maps-tools.ts`) and API results (`mcp-result-cache.ts`, 10-minute TTL, promise-based to dedup concurrent calls)
- MCP result cache logs use `miss`, `hit`, and `drop`. `drop` means the Google MCP promise rejected and was removed from cache; repeated `miss` + `drop` points to an upstream Google MCP/tool failure, not a cache storage failure.

### Key Files

| File                                           | Role                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `backend/src/services/trip-planner-service.ts` | Main orchestrator: runs parallel agents, combines outputs, validates       |
| `backend/src/agents/planner-agent.ts`          | Final planner; returns structured Zod-validated `TripPlan`                 |
| `backend/src/domain/trip.ts`                   | All Zod schemas (request/response types) — source of truth for data shapes |
| `backend/src/mcp/clients/google-map-client.ts` | MCP client for Google Maps HTTP transport                                  |
| `backend/src/mcp/tools/google-maps-tool-provider.ts` | Bundles MCP client + result cache; injected into every agent         |
| `backend/src/mcp/tools/mcp-result-cache.ts`    | Promise-based result cache (10-min TTL) shared across all agents           |
| `backend/src/services/llm-service.ts`          | LangChain model initialization                                             |
| `backend/src/prompts/`                         | System prompts for each agent + shared user prompt builder                 |
| `frontend/src/App.tsx`                         | Root view router (home ↔ result) using sessionStorage                      |
| `frontend/src/components/result/TripMap.tsx`   | Google Maps route visualization via `@react-google-maps/api`               |
| `frontend/src/api.ts`                          | Fetch wrapper for backend API                                              |

### Data Contract

`POST /api/trip/plan` accepts `TripPlanRequest` and returns `{ success, message, data?: TripPlan }`. The `TripPlan` includes `days[]`, `weather_info[]`, `routes[]` (between stops), and `budget`. All shapes are defined as Zod schemas in `backend/src/domain/trip.ts` and mirrored as TypeScript interfaces in `frontend/src/types.ts`.

### Frontend State

Session storage persists the trip plan between page navigation. The `App.tsx` root component handles the home/result view switch. No external state library — pure React hooks.

## Linting and Formatting

ESLint (v9 flat config) + Prettier are configured in both `backend/` and `frontend/`. Run from within each directory:

```bash
npm run lint      # ESLint
npm run format    # Prettier (writes in place)
```

Shared Prettier settings live at the root `.prettierrc`. No Jest or Vitest — type-checking (`npx tsc --noEmit`) and ESLint are the primary static checks.
