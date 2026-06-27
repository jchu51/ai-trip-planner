import { z } from "zod";
import "dotenv/config";

const parseCsv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(8000),
  LLM_MODEL_ID: z.string().min(1, "LLM_MODEL_ID is required"),
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_TIMEOUT: z.coerce.number().positive().default(60),
  GOOGLE_API_KEY: z.string().min(1, "GOOGLE_API_KEY is required"),
  GOOGLE_MCP_URL: z.string().min(1, "GOOGLE_MCP_URL is required"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000"),
});

const env = envSchema.parse(process.env);

export type McpTransport = "stdio" | "http" | "sse";

export type Config = {
  server: {
    nodeEnv: "development" | "test" | "production";
    host: string;
    port: number;
    corsOrigins: string[];
  };
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
  server: {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    corsOrigins: parseCsv(env.CORS_ORIGINS),
  },
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
