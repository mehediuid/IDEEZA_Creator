// POST /api/refine
//
// Rewrites the user's raw text — using a FREE LLM (Pollinations text API, no
// API key) — into whichever of two things the caller asked for: a project
// brief ("brief", the default) or a 10-second product-video scene ("video",
// the Prompt Help modal). Falls back to a deterministic template per mode if
// the model is unreachable, so the button always returns something.
//
// Request:  { prompt: string, mode?: "brief" | "video" }
// Response: { refined: string }

import { NextResponse } from "next/server";
import { refinePromptTemplate } from "@/lib/dashboard/refine";
import { videoScenePrompt } from "@/lib/brief/video-prompt";

export const runtime = "edge";

type RefineMode = "brief" | "video";

const SYSTEM: Record<RefineMode, string> = {
  brief:
    "You rewrite a user's rough electronics project idea into ONE clear, concrete project brief. " +
    "Name the microcontroller, the key sensors, the power source, and the enclosure, and state the expected outputs. " +
    "Keep it to 1–2 sentences. Output ONLY the rewritten brief — no preamble, no markdown, no quotes, no lists.",
  video:
    "Rewrite the user's product idea as a single vivid 10-second product-video scene for a text-to-video model: " +
    "subject, setting, camera move, lighting, mood. One paragraph, ≤ 60 words, no lists.",
};

async function refineWithAI(prompt: string, mode: RefineMode): Promise<string> {
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
          { role: "system", content: SYSTEM[mode] },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const text = (await res.text()).trim();
    // Reject error JSON / runaway output; we want a short plain-text answer.
    if (!text || text.startsWith("{") || text.startsWith("[") || text.length > 900) {
      return "";
    }
    // The provider answers 200 with prose when the shared key is out of
    // budget or rate-limited. That prose is not a brief — fall through to
    // the deterministic template rather than pasting it into the user's box.
    if (
      /\b(api key|key budget|rate limit|quota|too many requests)\b/i.test(text) ||
      /pollinations\.ai/i.test(text)
    ) {
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
  const mode: RefineMode =
    typeof body === "object" &&
    body !== null &&
    (body as { mode?: unknown }).mode === "video"
      ? "video"
      : "brief";
  if (prompt.trim().length < 6) {
    return NextResponse.json({ refined: "" });
  }
  const ai = await refineWithAI(prompt.trim(), mode);
  const refined =
    ai ||
    (mode === "video" ? videoScenePrompt(prompt) : refinePromptTemplate(prompt));
  return NextResponse.json({ refined });
}
