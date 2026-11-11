import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { aiExtractionSchema, type TripExtraction } from "./schemas";
import { buildSystemPrompt } from "./prompt";
import { normalizeExtraction } from "./normalize";

export class AiNotConfiguredError extends Error {}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Resolves the provider settings. Works with an OpenAI key directly, or with an
 * OpenRouter key (sk-or-...), which serves the same OpenAI models via an
 * OpenAI-compatible API. OPENAI_BASE_URL overrides auto-detection.
 */
export function resolveProvider(env: Record<string, string | undefined> = process.env) {
  const apiKey = env.OPENAI_API_KEY ?? "";
  const isOpenRouter = apiKey.startsWith("sk-or-") || (env.OPENAI_BASE_URL ?? "").includes("openrouter.ai");
  const baseURL = env.OPENAI_BASE_URL || (isOpenRouter ? "https://openrouter.ai/api/v1" : undefined);
  const rawModel = env.OPENAI_MODEL || "gpt-4o-mini";
  const model = isOpenRouter && !rawModel.includes("/") ? `openai/${rawModel}` : rawModel;
  return { apiKey, baseURL, model, provider: isOpenRouter ? "openrouter" : "openai" } as const;
}

/** Calls the LLM and returns a schema-validated, normalised extraction (spec §4). */
export async function extractTrip(description: string): Promise<TripExtraction> {
  if (!process.env.OPENAI_API_KEY) throw new AiNotConfiguredError("OPENAI_API_KEY is not set");
  const { apiKey, baseURL, model } = resolveProvider();

  const openai = createOpenAI({ apiKey, baseURL, compatibility: "strict" });
  const { object } = await generateObject({
    model: openai(model, { structuredOutputs: true }),
    schema: aiExtractionSchema,
    schemaName: "TripExtraction",
    system: buildSystemPrompt(),
    prompt: `Caregiver message:\n"""\n${description}\n"""`,
    temperature: 0,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(20_000),
  });
  return normalizeExtraction(object);
}
