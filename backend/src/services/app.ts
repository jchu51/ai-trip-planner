import {
  HotelAgent,
  LookupWeathearAgent,
  PlannerAgent,
  SearchPlacesAgent,
} from "../agents/index";
import { googleMapsMcpClient } from "../mcp/clients/google-map-client";
import { llmService } from "./llm-service";

export const app = async () => {
  const model = await llmService.init();
  const weathearAgent = new LookupWeathearAgent(
    "lookupWeatherAgent",
    model,
    googleMapsMcpClient,
  );
  const searchPlacesAgent = new SearchPlacesAgent(
    "searchPlacesAgent",
    model,
    googleMapsMcpClient,
  );

  const hotelAgent = new HotelAgent("hotelAgent", model, googleMapsMcpClient);
  const plannerAgent = new PlannerAgent("plannerAgent", model);

  const userPrompt =
    "Plan a 3-day trip to Taipei for two people. We like temples, local food, and a medium budget.";

  try {
    const [wResponse, pResponse, hResponse] = await Promise.all([
      weathearAgent.run(userPrompt),
      searchPlacesAgent.run(userPrompt),
      hotelAgent.run(userPrompt),
    ]);

    const plannerInput = `
Original user request:
${userPrompt}

Weather agent output:
${wResponse}

Search places agent output:
${pResponse}

Hotel agent output:
${hResponse}
`.trim();

    const finalPlan = await plannerAgent.run(plannerInput);

    console.log("finalPlan: \n", finalPlan);
  } finally {
    await googleMapsMcpClient.close();
  }
};

app().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
