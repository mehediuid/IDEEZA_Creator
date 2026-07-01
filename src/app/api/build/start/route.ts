// POST /api/build/start
//
// Phase 2 entry point. Receives the locked concept image + prompt and
// returns a synthetic job id. The actual build state lives in the
// client store; this route is a placeholder so a real backend can
// hook in later without changing call sites.
//
// Request:  { chatId, turnId, imageUrl, prompt }
// Response: { jobId }

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const obj = (body ?? {}) as {
    chatId?: unknown;
    turnId?: unknown;
    imageUrl?: unknown;
    prompt?: unknown;
  };
  const chatId = String(obj.chatId ?? "");
  const turnId = String(obj.turnId ?? "");
  const imageUrl = String(obj.imageUrl ?? "");
  const prompt = String(obj.prompt ?? "");
  if (!chatId || !turnId || !imageUrl) {
    return NextResponse.json(
      { error: "chatId, turnId, imageUrl are required" },
      { status: 400 },
    );
  }
  const jobId = `build_${chatId.slice(-6)}_${Date.now().toString(36)}`;
  return NextResponse.json({ jobId, chatId, turnId, imageUrl, prompt });
}
