// POST /api/video/storyboard
//
// Drafts a product video's three-scene storyboard (lib/video/storyboard.ts)
// with the same text model the other AI helpers use (lib/server/text-model.ts).
// The model is asked for JSON; an answer that isn't exactly three scenes, a
// provider notice, a timeout or an error all fall back to the storyboard
// drafted from the maker's own words — so the button always gets scenes back,
// and `by` says which.
//
// Request:  { productName, description, videoPrompt, audioPrompt } (strings)
// Response: { storyboard: Storyboard }

import { NextResponse } from "next/server";
import { askText } from "@/lib/server/text-model";
import {
  STORYBOARD_SYSTEM,
  draftStoryboard,
  parseStoryboard,
  storyboardRequestOf,
  type StoryboardInput,
} from "@/lib/video/storyboard";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

async function askModel(input: StoryboardInput): Promise<string> {
  // The text model (lib/server/text-model.ts): Groq first when GROQ_API_KEY is set, then
  // Pollinations, inside one 45 s budget on Node; nothing when neither answered.
  const text = (await askText({ system: STORYBOARD_SYSTEM, user: storyboardRequestOf(input) })) ?? "";
  if (/\b(api key|key budget|rate limit|quota|too many requests)\b/i.test(text) || /pollinations\.ai/i.test(text)) return "";
  return text;
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
