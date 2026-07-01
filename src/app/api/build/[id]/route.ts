// GET /api/build/:id
//
// Returns a synthetic build snapshot. Today this is a deterministic
// progress curve so the UI has something to render against; the
// authoritative live progress is held by the client store. When a real
// backend lands, this route returns the canonical job state and the
// client store will reconcile.
//
// Response: { id, items: [{ kind, status, progress }] }

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return NextResponse.json({
    id,
    items: [
      { kind: "3d", status: "building", progress: 0 },
      { kind: "pcb", status: "building", progress: 0 },
      { kind: "code", status: "building", progress: 0 },
    ],
  });
}
