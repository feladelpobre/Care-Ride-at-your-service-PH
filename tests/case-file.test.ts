import { describe, expect, it } from "vitest";
import { buildPlan } from "@/lib/plan";
import { SAMPLE_OPTIONS, SAMPLE_TRIP, UAT, VALIDATION, PRD_FEATURES } from "@/lib/caseFile";
import { config } from "@/middleware";
import { readFileSync } from "node:fs";

describe("public Case File page (AC32)", () => {
  it("is public: not behind the human check, so search engines and link previews can read it", () => {
    expect(config.matcher.some((m) => m.startsWith("/case"))).toBe(false);
  });

  it("computes the worked fare with the app's real rules", () => {
    const p = buildPlan(SAMPLE_TRIP, SAMPLE_OPTIONS);
    expect(p.assessment.vehicle).toBe("wav_ramp_van");
    expect(p.assessment.crewSize).toBe(2);
    expect(p.assessment.companionHours).toBe(3);
    expect(p.assessment.quote.discount).toBeGreaterThan(0);
    expect(p.assessment.quote.total).toBe(p.assessment.quote.lines.reduce((s, l) => s + l.amount, 0));
  });

  it("covers all 7 validation steps and every PRD feature cites spec acceptance criteria that exist", () => {
    expect(VALIDATION.map((v) => v.step)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    const spec = readFileSync("spec.md", "utf8");
    const cited = PRD_FEATURES.flatMap((f) => f.ac.match(/AC\d+/g) ?? []);
    for (const ac of cited) expect(spec).toContain(`| ${ac} |`);
    expect(UAT.length).toBeGreaterThanOrEqual(10);
  });
});
