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

/** Calls the LLM and returns a schema-validated, normalised extraction (spec §4). */
export async function extractTrip(description: string): Promise<TripExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError("OPENAI_API_KEY is not set");

  const openai = createOpenAI({ apiKey });
  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini", { structuredOutputs: true }),
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
