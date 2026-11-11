import { describe, expect, it } from "vitest";
import { detectEmergency } from "@/lib/emergency";

describe("emergency red flags (AC2)", () => {
  it.each([
    "My father has chest pain and is sweating, need to go to the hospital",
    "Si lola hindi makahinga, kailangan dalhin sa ospital",
    "He is unconscious after falling",
    "Nawalan ng malay si tatay kanina",
    "Possible stroke, face drooping",
  ])("flags: %s", (text) => {
    expect(detectEmergency(text).emergency).toBe(true);
  });

  it.each([
    "Mama uses a wheelchair, dialysis at St. Luke's BGC on Tuesday 9am, 3rd floor no elevator",
    "This is a non-emergency check-up at PGH tomorrow 8am, naka-wheelchair si lolo",
  ])("does not flag routine trips: %s", (text) => {
    expect(detectEmergency(text).emergency).toBe(false);
  });
});
