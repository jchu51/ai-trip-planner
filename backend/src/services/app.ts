import { LookupWeathearAgent, SearchPlacesAgent } from "../agents/index";
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

  const userPrompt = "I want to go to NY, in next month";

  const wResponse = await weathearAgent.run(userPrompt);
  const pResponse = await searchPlacesAgent.run(userPrompt);

  console.log("wResponse: \n", wResponse);
  console.log("pResponse: \n", pResponse);
};

app().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
