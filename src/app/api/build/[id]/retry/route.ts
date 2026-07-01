// POST /api/build/:id/retry
//
// Marks a single failed item as queued again. Stub.
//
// Request:  { kind: "3d" | "pcb" | "code" }

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
  const kind = String(
    (body as { kind?: unknown })?.kind ?? "",
  ) as "3d" | "pcb" | "code" | "";
  if (kind !== "3d" && kind !== "pcb" && kind !== "code") {
    return NextResponse.json(
      { error: "Unknown item kind" },
      { status: 400 },
    );
  }
  return NextResponse.json({ id, kind, status: "building", progress: 0 });
}
