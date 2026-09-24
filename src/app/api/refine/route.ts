// POST /api/refine
//
// Rewrites the user's raw text — using a FREE LLM (Pollinations text API, no
// API key) — into whichever thing the caller asked for: a project brief
// ("brief", the default), a 10-second product-video scene ("video", the Prompt
// Help modal), or one precise instruction for a change to a concept already
// on screen ("change", the chat composer). Falls back to a deterministic
// answer per mode if the model is unreachable, so the button always returns
// something.
//
// Request:  { prompt: string, mode?: "brief" | "video" | "change" }
// Response: { refined: string }

import { NextResponse } from "next/server";
import { refinePromptTemplate } from "@/lib/dashboard/refine";
import { videoScenePrompt } from "@/lib/brief/video-prompt";

type RefineMode = "brief" | "video" | "change";
const MODES: RefineMode[] = ["brief", "video", "change"];

const SYSTEM: Record<RefineMode, string> = {
  brief:
    "You rewrite a user's rough electronics project idea into ONE clear, concrete project brief. " +
    "Name the microcontroller, the key sensors, the power source, and the enclosure, and state the expected outputs. " +
    "Keep it to 1–2 sentences. Output ONLY the rewritten brief — no preamble, no markdown, no quotes, no lists.",
  video:
    "Rewrite the user's product idea as a single vivid 10-second product-video scene for a text-to-video model: " +
    "subject, setting, camera move, lighting, mood. One paragraph, ≤ 60 words, no lists.",
  change:
    "The user is asking for a change to a product concept image that already exists. " +
    "Rewrite their request as ONE short, specific instruction that describes only the change — material, colour, shape, size, a feature added or removed. " +
    "Do not describe the whole product, do not name a microcontroller or parts, and never invent a different product. " +
    "At most 25 words. Output ONLY the instruction — no preamble, no quotes, no lists.",
};

// The change-mode fallback: the maker's own words, tidied — a capital and a
// full stop. Nothing is added, because anything added would be a guess.
function tidyChange(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

async function refineWithAI(prompt: string, mode: RefineMode): Promise<string> {
  // The anonymous model reasons before it answers, and under load that takes
  // 15–40 s on either endpoint — past the old 20 s cut-off, so the template
  // answered most of the time. The OpenAI-shaped endpoint keeps the reasoning
  // out of `content`. Node, not edge: Vercel ends an edge function that has
  // not started answering in 25 s, before this 45 s bound.
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
        messages: [
          { role: "system", content: SYSTEM[mode] },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const envelope = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = envelope.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
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
  const asked =
    typeof body === "object" && body !== null
      ? (body as { mode?: unknown }).mode
      : undefined;
  const mode: RefineMode = MODES.includes(asked as RefineMode)
    ? (asked as RefineMode)
    : "brief";
  if (prompt.trim().length < 6) {
    return NextResponse.json({ refined: "" });
  }
  const answer = await refineWithAI(prompt.trim(), mode);
  // A change that comes back as a paragraph has been turned into a product
  // description, which is the failure this mode exists to prevent.
  const ai = mode === "change" && answer.length > 220 ? "" : answer;
  const refined =
    ai ||
    (mode === "video"
      ? videoScenePrompt(prompt)
      : mode === "change"
        ? tidyChange(prompt)
        : refinePromptTemplate(prompt));
  return NextResponse.json({ refined });
}
