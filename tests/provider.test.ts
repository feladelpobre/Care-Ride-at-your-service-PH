import { describe, expect, it } from "vitest";
import { resolveProvider } from "@/lib/ai";

describe("AI provider resolution", () => {
  it("uses OpenAI directly for sk- keys", () => {
    const p = resolveProvider({ OPENAI_API_KEY: "sk-proj-abc" });
    expect(p.provider).toBe("openai");
    expect(p.baseURL).toBeUndefined();
    expect(p.model).toBe("gpt-4o-mini");
  });
  it("routes OpenRouter keys through openrouter.ai with the openai/ model prefix", () => {
    const p = resolveProvider({ OPENAI_API_KEY: "sk-or-v1-abc", OPENAI_MODEL: "gpt-4o-mini" });
    expect(p.provider).toBe("openrouter");
    expect(p.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(p.model).toBe("openai/gpt-4o-mini");
  });
  it("respects an explicit OPENAI_BASE_URL", () => {
    expect(resolveProvider({ OPENAI_API_KEY: "x", OPENAI_BASE_URL: "https://example.test/v1" }).baseURL).toBe("https://example.test/v1");
  });
});
