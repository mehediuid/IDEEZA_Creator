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
// Response: { title: string; summary: string; parts: ConceptPart[] }

import { NextResponse } from "next/server";
import {
  CONCEPT_CATEGORIES,
  fallbackConcept,
  parseConcept,
  summaryFromParts,
  type ConceptSummary,
} from "@/lib/create/concept";

export const runtime = "edge";

const SYSTEM =
  "You turn a rough electronics project idea into a parts-level concept. " +
  "Reply with STRICT JSON and nothing else — no markdown, no code fence, no preamble — " +
  'in the shape {"title": string, "summary": string, "parts": [{"name": string, "role": string, "category": string}]}. ' +
  "Give 4 to 6 parts: a microcontroller, the sensors and actuators the idea needs, power, and the connector. " +
  "title is at most 40 characters and names the product, not the sentence. " +
  'summary is the part names joined by " · ". ' +
  "role is a short phrase saying what that part does in this project. " +
  `category is exactly one of: ${CONCEPT_CATEGORIES.join(", ")}.`;

// Strips a ```json fence if the model wrapped its answer in one.
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

async function summarizeWithAI(
  prompt: string,
): Promise<ConceptSummary | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = unfence((await res.text()).trim());
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
    // The summary is always the parts line, whoever wrote it, so the
    // card under the title can't disagree with the list beside it.
    summary: summaryFromParts(concept.parts),
    parts: concept.parts,
  });
}
