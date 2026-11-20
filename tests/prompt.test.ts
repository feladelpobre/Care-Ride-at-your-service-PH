import { describe, expect, it } from "vitest";
import { buildFaqPrompt, buildSystemPrompt } from "@/lib/prompt";

describe("AI instructions don't limit riders to Metro Manila (AC29, AC36)", () => {
  it("trip intake says riders may be anywhere in the Philippines and keeps the place they name", () => {
    const p = buildSystemPrompt(new Date("2026-11-20T00:00:00Z"));
    expect(p).toMatch(/anywhere in the country/);
    expect(p).toMatch(/keep any city or province they name/);
    expect(p).toMatch(/NON-EMERGENCY/);
  });

  it("the FAQ helper describes the service as Philippines-wide", () => {
    expect(buildFaqPrompt()).toMatch(/elsewhere in the Philippines/);
  });
});
