// POST /api/projects/:id/appreciate   body: { active: boolean }
//
// Toggles the signed-in user's appreciation of a project. Stub — echoes the
// new state so the client can confirm its optimistic update (and revert on a
// non-OK response). A real implementation persists per-user appreciation and
// returns the authoritative count.

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  let active = true;
  try {
    const body = (await req.json()) as { active?: unknown };
    active = body?.active !== false;
  } catch {
    // default to active=true on a missing/invalid body
  }
  return NextResponse.json({ ok: true, active });
}
