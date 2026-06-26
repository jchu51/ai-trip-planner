import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  LLM_MODEL_ID: z.string().min(1, "LLM_MODEL_ID is required"),
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_TIMEOUT: z.coerce.number().positive().default(60),
  GOOGLE_API_KEY: z.string().min(1, "GOOGLE_API_KEY is required"),
  GOOGLE_MCP_URL: z.string().min(1, "GOOGLE_MCP_URL is required"),
});

const env = envSchema.parse(process.env);

export type McpTransport = "stdio" | "http" | "sse";

export type Config = {
  llm: {
    modelId: string;
    apiKey: string;
    timeout: number;
  };
  google: {
    apiKey: string;
    mcpUrl: string;
    mcpTransport: "http";
  };
};

export const config: Config = {
  llm: {
    modelId: env.LLM_MODEL_ID,
    apiKey: env.LLM_API_KEY,
    timeout: env.LLM_TIMEOUT,
  },
  google: {
    apiKey: env.GOOGLE_API_KEY,
    mcpUrl: env.GOOGLE_MCP_URL,
    mcpTransport: "http",
  },
};
