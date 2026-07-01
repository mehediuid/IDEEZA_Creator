// POST /api/refine
//
// Rewrites the user's raw project idea into one concrete brief — using a FREE
// LLM (Pollinations text API, no API key). Falls back to a deterministic
// template if the model is unreachable, so the button always returns something.
//
// Request:  { prompt: string }
// Response: { refined: string }

import { NextResponse } from "next/server";
import { refinePromptTemplate } from "@/lib/dashboard/refine";

export const runtime = "edge";

const SYSTEM =
  "You rewrite a user's rough electronics project idea into ONE clear, concrete project brief. " +
  "Name the microcontroller, the key sensors, the power source, and the enclosure, and state the expected outputs. " +
  "Keep it to 1–2 sentences. Output ONLY the rewritten brief — no preamble, no markdown, no quotes, no lists.";

async function refineWithAI(prompt: string): Promise<string> {
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
    if (!res.ok) return "";
    const text = (await res.text()).trim();
    // Reject error JSON / runaway output; we want a short plain-text brief.
    if (!text || text.startsWith("{") || text.startsWith("[") || text.length > 900) {
      return "";
    }
    return text.replace(/^["']+|["']+$/g, "").trim();
  } catch {
    clearTimeout(timer);
    return "";
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
      ? String((body as { prompt?: unknown }).prompt ?? "")
      : "";
  if (prompt.trim().length < 6) {
    return NextResponse.json({ refined: "" });
  }
  const ai = await refineWithAI(prompt.trim());
  const refined = ai || refinePromptTemplate(prompt);
  return NextResponse.json({ refined });
}
