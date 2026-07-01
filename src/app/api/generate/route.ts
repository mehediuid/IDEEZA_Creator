// POST /api/generate
//
// Stub project-draft creation. The real implementation will persist a draft
// (off-chain, per product rule — no wallet/KYC at this stage) and return
// its id. For now we synthesize a deterministic id so the dashboard can
// route the user into the PCB editor with the prompt carried along.
//
// Request:  { prompt: string; mode: "ai" | "manual" }
// Response: { draftId: string; nextStep: "pcb"; prompt: string; mode: string }

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const obj = (body ?? {}) as { prompt?: unknown; mode?: unknown };
  const prompt = String(obj.prompt ?? "").trim();
  const mode = obj.mode === "manual" ? "manual" : "ai";
  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 },
    );
  }
  // Deterministic-ish stub id derived from prompt length + first chars.
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const draftId = `draft_${slug || "untitled"}_${prompt.length}`;
  return NextResponse.json({
    draftId,
    nextStep: "pcb",
    prompt,
    mode,
  });
}
