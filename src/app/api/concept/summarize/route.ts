// POST /api/concept/summarize
//
// Turns the user's concept prompt into the three things every build
// carries: a short title, the one-line parts summary under it, and the
// parts themselves (which every deliverable is derived from). Uses the
// same free Pollinations text model as /api/refine, and falls back to a
// real four-part concept when the model is unreachable or answers with
// something we can't parse — the build must never start on an empty
// parts list.
//
// Request:  { prompt: string }
// Response: { title: string; summary: string; parts: ConceptPart[]; hints?;
//             fallback?: true — the parts are the stand-in, not a reading }

import { NextResponse } from "next/server";
import {
  CONCEPT_CATEGORIES,
  fallbackConcept,
  parseConcept,
  summaryFromParts,
  type ConceptSummary,
} from "@/lib/create/concept";

const SYSTEM =
  "You turn a rough electronics project idea into a parts-level concept. " +
  "Reply with STRICT JSON and nothing else — no markdown, no code fence, no preamble — " +
  'in the shape {"title": string, "description": string, "summary": string, "parts": [{"name": string, "role": string, "category": string}], ' +
  '"spec": {"battery": string, "material": string, "useCase": [string], "runtimeGoalH": number}}. ' +
  "Give 4 to 6 parts: a microcontroller, the sensors and actuators the idea needs, power, and the connector. " +
  "title is at most 40 characters and names the product, not the sentence. " +
  "description is ONE sentence, at most 140 characters, saying what the product is and does — " +
  "no marketing, no adjectives it cannot support. " +
  'summary is the part names joined by " · ". ' +
  "role is a short phrase saying what that part does in this project. " +
  `category is exactly one of: ${CONCEPT_CATEGORIES.join(", ")}. ` +
  "spec.battery is exactly one of: none (USB powered), adapter (a wall/DC adapter or mains supply, no battery), " +
  "li-1s-100 (a coin-size pack for a ring or a tiny wearable), li-1s-400, li-1s-1000, li-1s-2000 (an 18650 cell), " +
  "li-2s-1500, aa-2, aa-4, 9v (a 9 V PP3 battery) — the pack this product would really use. " +
  "spec.material is exactly one of: PLA, PETG, ASA, TPU — the enclosure plastic for where it is used. " +
  "spec.useCase lists whichever apply of: handheld, outdoor, waterproof, wearable, desk. " +
  "spec.runtimeGoalH is how many hours it should run on one charge; leave it out when it is USB powered.";

// Strips a ```json fence if the model wrapped its answer in one.
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

async function summarizeWithAI(
  prompt: string,
): Promise<ConceptSummary | null> {
  // The anonymous model reasons before it answers, and under load that takes
  // 15–40 s on either endpoint — past the old 20 s cut-off, so every build
  // started on the fallback parts. The OpenAI-shaped endpoint keeps the
  // reasoning out of `content`. Node, not edge: Vercel ends an edge function
  // that has not started answering in 25 s, before this 45 s bound.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai-fast",
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const envelope = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = envelope.choices?.[0]?.message?.content;
    const text = unfence(typeof content === "string" ? content : "");
    if (!text || text.length > 4000) return null;
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return null;
    }
    return parseConcept(raw, prompt);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const prompt =
    typeof body === "object" && body !== null && "prompt" in body
      ? String((body as { prompt?: unknown }).prompt ?? "").trim()
      : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const concept = (await summarizeWithAI(prompt)) ?? fallbackConcept(prompt);
  return NextResponse.json({
    title: concept.title,
    description: concept.description,
    // The summary is always the parts line, whoever wrote it, so the
    // card under the title can't disagree with the list beside it.
    summary: summaryFromParts(concept.parts),
    parts: concept.parts,
    // The spec sheet's hints, already checked by parseConcept; absent when
    // the model gave none we recognise or the fallback answered.
    ...(concept.hints ? { hints: concept.hints } : null),
    // Said out loud, so the client neither caches the stand-in as the
    // reading nor lets the card present generic parts as this product's.
    ...(concept.fallback ? { fallback: true } : null),
  });
}
