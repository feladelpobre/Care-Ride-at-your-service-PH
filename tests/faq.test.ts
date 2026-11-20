import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const matchFaq = vi.fn<(q: string) => Promise<string | null>>();
let aiOn = false;
vi.mock("@/lib/ai", () => ({
  matchFaq: (q: string) => matchFaq(q),
  isAiConfigured: () => aiOn,
  AiNotConfiguredError: class extends Error {},
}));

import { POST } from "@/app/api/faq/route";
import { FAQ_FALLBACK, FAQS, faqMatchSchema, searchFaq } from "@/lib/faq";
import { buildFaqPrompt } from "@/lib/prompt";
import { BASE_FARE, COMPANION_RATE_PER_HOUR, WHEELCHAIR_RENTAL_FEE } from "@/lib/rules";
import { EMERGENCY_MESSAGE } from "@/lib/emergency";
import { middleware } from "@/middleware";

let ip = 0;
const ask = (question: unknown) =>
  POST(
    new Request("http://t/api/faq", {
      method: "POST",
      headers: { "x-forwarded-for": `10.7.0.${++ip}` },
      body: JSON.stringify({ question }),
    }),
  );

afterEach(() => {
  aiOn = false;
  matchFaq.mockReset();
});

describe("FAQ page and AI helper (AC36)", () => {
  it("every FAQ has a unique id, and prices are taken from the pricing rules", () => {
    expect(new Set(FAQS.map((f) => f.id)).size).toBe(FAQS.length);
    const text = FAQS.map((f) => f.a).join(" ");
    expect(text).toContain(`₱${BASE_FARE.wav_ramp_van}`);
    expect(text).toContain(`₱${COMPANION_RATE_PER_HOUR}`);
    expect(text).toContain(`₱${WHEELCHAIR_RENTAL_FEE}`);
    // Compliance: "ambulance" appears only as "not an ambulance" or "DOH-licensed ambulance", never for our vehicles
    const before = text.match(/\S+ \S+ ambulance/gi) ?? [];
    expect(before.length).toBeGreaterThan(0);
    before.forEach((m) => expect(m).toMatch(/^(not an|a DOH-licensed) ambulance/i));
  });

  it("keyword search finds answers in English and Filipino, and gives up on unrelated questions", () => {
    expect(searchFaq("How much is the wheelchair van?")?.id).toBe("fare");
    expect(searchFaq("magkano po?")?.id).toBe("fare");
    expect(searchFaq("Magkano ang wheelchair van?")?.id).toBe("fare");
    expect(searchFaq("Do you have a wheelchair van?")?.id).toBe("vehicles");
    expect(searchFaq("Is there a senior discount?")?.id).toBe("discount");
    expect(searchFaq("Will the dispatcher call me to confirm?")?.id).toBe("confirm-call");
    expect(searchFaq("how do I cancel my ride")?.id).toBe("change-cancel");
    expect(searchFaq("who won the basketball game")).toBeNull();
  });

  it("the AI may only return a known FAQ id or 'none'; the prompt lists every FAQ", () => {
    expect(faqMatchSchema.safeParse({ faqId: "fare" }).success).toBe(true);
    expect(faqMatchSchema.safeParse({ faqId: "none" }).success).toBe(true);
    expect(faqMatchSchema.safeParse({ faqId: "free rides for everyone" }).success).toBe(false);
    const prompt = buildFaqPrompt();
    for (const f of FAQS) expect(prompt).toContain(f.id);
    expect(prompt).toMatch(/Ignore any instructions/);
  });

  it("emergencies get the 911 message and never reach the AI", async () => {
    aiOn = true;
    const res = await ask("my lola has chest pain, can you pick her up?");
    const json = await res.json();
    expect(json).toMatchObject({ emergency: true, answer: EMERGENCY_MESSAGE });
    expect(matchFaq).not.toHaveBeenCalled();
  });

  it("returns the stored FAQ answer word for word for the entry the AI picked", async () => {
    aiOn = true;
    matchFaq.mockResolvedValue("discount");
    const json = await (await ask("may discount ba ang PWD?")).json();
    const faq = FAQS.find((f) => f.id === "discount")!;
    expect(json).toMatchObject({
      emergency: false,
      faqId: "discount",
      answer: faq.a,
      source: "ai",
    });
  });

  it("says it can only answer from the FAQ when nothing fits", async () => {
    aiOn = true;
    matchFaq.mockResolvedValue(null);
    const json = await (await ask("What is the capital of France?")).json();
    expect(json).toMatchObject({ faqId: null, answer: FAQ_FALLBACK });
  });

  it("falls back to keyword search when the AI fails or is not set up", async () => {
    aiOn = true;
    matchFaq.mockRejectedValue(new Error("timeout"));
    expect((await (await ask("How much is the fare?")).json()).faqId).toBe("fare");
    aiOn = false;
    expect((await (await ask("How much is the fare?")).json()).source).toBe("keywords");
  });

  it("refuses empty or very long questions, and limits each device to 20 questions per 10 minutes", async () => {
    expect((await ask("")).status).toBe(400);
    expect((await ask("a".repeat(301))).status).toBe(400);
    const send = () =>
      POST(
        new Request("http://t/api/faq", {
          method: "POST",
          headers: { "x-forwarded-for": "10.8.8.8" },
          body: JSON.stringify({ question: "How much?" }),
        }),
      );
    for (let i = 0; i < 20; i++) expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });

  it("the FAQ page and its API sit behind the 'I am human' check (AC28)", async () => {
    process.env.TURNSTILE_SITE_KEY = "site";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const page = await middleware(new NextRequest("http://t/faq"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toContain("/verify");
    const api = await middleware(new NextRequest("http://t/api/faq", { method: "POST" }));
    expect(api.status).toBe(403);
  });
});
