import { initChatModel } from "langchain";
import { config } from "../config";

export type LLMServiceInitOptions = {
  temperature?: number;
  timeout?: number;
  maxTokens?: number;
  maxRetries?: number;
};

export class LLMService {
  async init(
    modelId: string = config.llm.modelId,
    options: LLMServiceInitOptions = {},
  ) {
    return initChatModel(modelId, {
      temperature: options.temperature ?? 0.7,
      timeout: options.timeout ?? config.llm.timeout,
      maxTokens: options.maxTokens ?? 10000,
      maxRetries: options.maxRetries ?? 6,
      apiKey: config.llm.apiKey,
    });
  }
}

export const llmService = new LLMService();
