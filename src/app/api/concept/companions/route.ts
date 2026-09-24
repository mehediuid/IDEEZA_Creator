// POST /api/concept/companions
//
// Part 4 spec §4.4.3 — after a concept is accepted, decide whether it
// describes a multi-product *system* and, if so, which other products
// that system needs. Same shape as /api/concept/summarize: the free
// Pollinations text model, strict JSON, and a deterministic answer when
// the model is unreachable or replies with something we cannot parse.
//
// The fallback here is **no companions**, not an invented list. The spec
// says most products are not part of a system, so silence is both the
// common case and the safe one — a wrong "your lamp needs a dock" sends
// the user down a branch that costs credits.
//
// Request:  { prompt: string, title?: string }
// Response: { isSystem: boolean, companions: { id, name, why }[] }

import { NextResponse } from "next/server";
import {
  classifyByRule,
  parseCompanions,
  type CompanionPlan,
} from "@/lib/create/companions";

const SYSTEM =
  "You decide whether an electronics product is one object or part of a multi-product system. " +
  "Reply with STRICT JSON and nothing else — no markdown, no code fence, no preamble — " +
  'in the shape {"isSystem": boolean, "companions": [{"name": string, "why": string}]}. ' +
  "A system is one where a SEPARATE physical product is needed for the main one to be used: " +
  "a drone needs a remote controller, a wireless earbud needs a charging case, " +
  "a sensor node needs a base station. " +
  "Most products are NOT systems: a lamp, a clock, a meter, a logger, a tracker are each one object. " +
  'When it is not a system answer {"isSystem": false, "companions": []} and nothing else. ' +
  "When it is, give 1 to 3 companions, each a separate physical product with its own enclosure and board. " +
  "Never list a part, a module, an app, a website or a service — those are inside the product, not beside it. " +
  "name is at most 40 characters. " +
  "why is one plain sentence saying what the companion is for, at most 120 characters.";

// Strips a ```json fence if the model wrapped its answer in one.
function unfence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

async function classifyWithAI(prompt: string): Promise<CompanionPlan | null> {
  // The anonymous model reasons before it answers. On the plain endpoint that
  // often ran past the old 20 s cut-off and the rule answered instead; asked
  // for low effort on the OpenAI-shaped endpoint it answers in a few seconds.
  // Node, not edge, so the 45 s bound is ours rather than the platform's.
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
    return parseCompanions(raw);
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
  const obj =
    typeof body === "object" && body !== null
      ? (body as { prompt?: unknown; title?: unknown })
      : {};
  const prompt = String(obj.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const title = String(obj.title ?? "").trim();
  // The title is what the summarizer decided this product *is*, so it is
  // the better subject for the question when we have one.
  const ask = title ? `${title}. ${prompt}` : prompt;
  // The model first — it is the only one that can reason about a product the
  // table has never heard of. When it cannot answer, the rule does, and when
  // the rule has nothing either the answer is a single product, which is both
  // the honest default and the common case.
  const plan = (await classifyWithAI(ask)) ?? classifyByRule(ask);
  return NextResponse.json(plan);
}
