import {
  HotelAgent,
  LookupWeatherAgent,
  PlannerAgent,
  SearchPlacesAgent,
} from "../agents";
import { googleMapsMcpClient } from "../mcp/clients/google-map-client";
import { llmService } from "../services/llm-service";

const runExample = async () => {
  const model = await llmService.init();
  const weatherAgent = new LookupWeatherAgent(
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
  const plannerAgent = new PlannerAgent(
    "plannerAgent",
    model,
    googleMapsMcpClient,
  );

  const userPrompt =
    "Plan a 3-day trip to Taipei for two people. We like temples, local food, and a medium budget.";

  try {
    const [weather, places, hotels] = await Promise.all([
      weatherAgent.run(userPrompt),
      searchPlacesAgent.run(userPrompt),
      hotelAgent.run(userPrompt),
    ]);

    const plannerInput = `
Original user request:
${userPrompt}

Weather agent output:
${weather}

Search places agent output:
${places}

Hotel agent output:
${hotels}
`.trim();

    const finalPlan = await plannerAgent.run(plannerInput);

    console.log("finalPlan: \n", finalPlan);
  } finally {
    await googleMapsMcpClient.close();
  }
};

runExample().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
