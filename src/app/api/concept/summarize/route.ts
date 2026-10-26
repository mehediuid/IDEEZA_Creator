// POST /api/concept/summarize
//
// Turns the user's concept prompt into the three things every build
// carries: a short title, the one-line parts summary under it, and the
// parts themselves (which every deliverable is derived from). Uses the
// app's one text model (lib/server/text-model.ts), and falls back to a
// real four-part concept when the model is unreachable or answers with
// something we can't parse — the build must never start on an empty
// parts list.
//
// Request:  { prompt: string; companion?: string — the companion's own name,
//             sent only when the prompt is a companion's brief, so the
//             stand-in reads its own words and not the idea it serves }
// Response: { title: string; summary: string; parts: ConceptPart[]; hints?;
//             fallback?: true — the parts are the stand-in, not a reading }

import { NextResponse } from "next/server";
import { askText } from "@/lib/server/text-model";
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
  // The text model (lib/server/text-model.ts): Groq first when GROQ_API_KEY is set, then
  // Pollinations, inside one 45 s budget on Node; null when neither answered.
  const answer = await askText({ system: SYSTEM, user: prompt, json: true });
  const text = unfence(answer ?? "");
  if (!text || text.length > 4000) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  return parseConcept(raw, prompt);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const fields =
    typeof body === "object" && body !== null
      ? (body as { prompt?: unknown; companion?: unknown })
      : {};
  const prompt = String(fields.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const companion =
    typeof fields.companion === "string" ? fields.companion.trim().slice(0, 120) || undefined : undefined;
  const concept = (await summarizeWithAI(prompt)) ?? fallbackConcept(prompt, companion);
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
