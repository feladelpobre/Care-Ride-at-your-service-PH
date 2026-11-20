import { NextResponse } from "next/server";
import { z } from "zod";
import { isAiConfigured, matchFaq } from "@/lib/ai";
import { detectEmergency, EMERGENCY_MESSAGE } from "@/lib/emergency";
import { FAQ_FALLBACK, faqById, searchFaq } from "@/lib/faq";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { sanitizeText } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(3, "Please type a question.").max(300, "Please keep the question under 300 characters.")),
});

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * "Ask a question" helper (AC36). Order matters:
 * 1. Emergency check first (never sent to the AI). 2. Rate limit. 3. AI picks an FAQ entry; keyword search if the AI is off or fails.
 * The answer is always the stored FAQ text, never AI-written.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Please type a question." }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Please type a question." }, 400);
  const question = parsed.data.question;

  if (detectEmergency(question).emergency) {
    return json({ emergency: true, answer: EMERGENCY_MESSAGE, faqId: null });
  }
  if (!rateLimit(`faq:${clientKey(req)}`, 20)) {
    return json(
      {
        error: "Too many questions. Please wait a few minutes, or read the FAQ list below.",
      },
      429,
    );
  }

  let faqId: string | null = null;
  let source: "ai" | "keywords" = "keywords";
  if (isAiConfigured()) {
    try {
      faqId = await matchFaq(question);
      source = "ai";
    } catch {
      faqId = searchFaq(question)?.id ?? null; // AI down: keyword search instead
    }
  } else {
    faqId = searchFaq(question)?.id ?? null;
  }
  const faq = faqById(faqId);
  return json({
    emergency: false,
    faqId: faq?.id ?? null,
    question: faq?.q ?? null,
    answer: faq?.a ?? FAQ_FALLBACK,
    source,
  });
}
