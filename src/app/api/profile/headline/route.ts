// POST /api/profile/headline — "Suggest from my work" (owner decision D7,
// spec 2026-10-14-creator-profile-design.md).
//
// Drafts a profile headline from the maker's shared projects. The client
// sends only what is already public (each shared project's title and story);
// the dialog shows the reply as a labelled draft that is saved only when the
// maker presses Use this, then Save profile. Same client settings as
// /api/concept/summarize: the app's text model (lib/server/text-model.ts),
// low reasoning effort, Node runtime, a 45 s bound.
//
// Request:  { projects: { title: string; story: string }[] }
// Response: { headline } — or 400 with nothing to write from, or 503
//           { error: "unavailable" } when the model can't be reached or its
//           reply isn't a headline. Never fallback text.

import { NextResponse } from "next/server";
import { askText } from "@/lib/server/text-model";
import { HEADLINE_SYSTEM, cleanHeadline, headlinePrompt } from "@/lib/people/headline";

export const runtime = "nodejs";

async function draft(prompt: string): Promise<string | null> {
  // The text model (lib/server/text-model.ts): Groq first when GROQ_API_KEY is set, then
  // Pollinations, inside one 45 s budget on Node; null when neither answered.
  const content = await askText({ system: HEADLINE_SYSTEM, user: prompt });
  return content && content.length <= 2000 ? cleanHeadline(content) : null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = typeof body === "object" && body !== null ? (body as { projects?: unknown }).projects : null;
  const projects = Array.isArray(raw)
    ? raw.map((p) => {
        const r = (typeof p === "object" && p !== null ? p : {}) as { title?: unknown; story?: unknown };
        return { title: typeof r.title === "string" ? r.title : "", story: typeof r.story === "string" ? r.story : "" };
      })
    : [];
  const prompt = headlinePrompt(projects);
  if (!prompt) return NextResponse.json({ error: "Share a project first" }, { status: 400 });
  const headline = await draft(prompt);
  if (!headline) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ headline });
}
