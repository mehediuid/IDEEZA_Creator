// POST /api/build/:id/retry
//
// Marks a failed item as queued again — or the whole build, when the
// build died on our side and every artifact has to be rebuilt. Stub.
//
// Request:  { kind: "3d" | "pcb" | "code" | "wiring" | "parts" | "all" }

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const KINDS = ["3d", "pcb", "code", "wiring", "parts", "all"] as const;
  type RetryKind = (typeof KINDS)[number];
  const kind = String((body as { kind?: unknown })?.kind ?? "") as RetryKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "Unknown item kind" },
      { status: 400 },
    );
  }
  return NextResponse.json({ id, kind, status: "building", progress: 0 });
}
