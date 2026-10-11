// POST /api/video/storyboard
//
// Drafts a product video's three-scene storyboard (lib/video/storyboard.ts)
// with the same free model the other AI helpers use (Pollinations, no key).
// The model is asked for JSON; an answer that isn't exactly three scenes, a
// provider notice, a timeout or an error all fall back to the storyboard
// drafted from the maker's own words — so the button always gets scenes back,
// and `by` says which.
//
// Request:  { productName, description, videoPrompt, audioPrompt } (strings)
// Response: { storyboard: Storyboard }

import { NextResponse } from "next/server";
import {
  STORYBOARD_SYSTEM,
  draftStoryboard,
  parseStoryboard,
  storyboardRequestOf,
  type StoryboardInput,
} from "@/lib/video/storyboard";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

async function askModel(input: StoryboardInput): Promise<string> {
  // The anonymous model reasons before it answers (15–40 s under load); Node, not edge, so the
  // 45 s bound holds (see /api/refine).
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
          { role: "system", content: STORYBOARD_SYSTEM },
          { role: "user", content: storyboardRequestOf(input) },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    const envelope = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = envelope.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : "";
    if (/\b(api key|key budget|rate limit|quota|too many requests)\b/i.test(text) || /pollinations\.ai/i.test(text)) return "";
    return text;
  } catch {
    clearTimeout(timer);
    return "";
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    body = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input: StoryboardInput = {
    productName: str(body.productName, 120),
    description: str(body.description, 1000),
    videoPrompt: str(body.videoPrompt, 1000),
    audioPrompt: str(body.audioPrompt, 600),
  };
  const scenes = parseStoryboard(await askModel(input));
  return NextResponse.json({ storyboard: scenes ? { scenes, by: "ai" } : draftStoryboard(input) });
}
