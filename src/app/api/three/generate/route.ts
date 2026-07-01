// /api/three/generate — AI image→3D for the 3D module.
//
//   POST  { prompt?, imageUrl?, seed? }
//         → { provider, taskId, imageUrl }   (kicks off generation)
//   GET   ?provider=&taskId=
//         → { status, progress, glbUrl? }    (poll until ready/failed)
//
// 3D generation is heavy and asynchronous, so we mirror the provider's own
// create-then-poll shape rather than blocking one request for minutes. The
// client polls GET and shows progress; the existing concept image is shown
// meanwhile so there's always something on screen.
//
// Runtime is Node (not edge): the provider call and image warming are plain
// fetches, but we keep Node so heavier server work (binary handling, longer
// timeouts) stays available as this grows.

import { NextResponse, type NextRequest } from "next/server";
import {
  createTask,
  pollTask,
  type ThreeProvider,
} from "@/lib/three/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { prompt?: string; imageUrl?: string; seed?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  const imageUrl = (body.imageUrl ?? "").trim();
  if (!prompt && !imageUrl) {
    return NextResponse.json(
      { error: "Provide a prompt or an image." },
      { status: 400 },
    );
  }

  try {
    const result = await createTask({
      prompt,
      imageUrl: imageUrl || undefined,
      seed: typeof body.seed === "number" ? body.seed : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "generation failed" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const provider = sp.get("provider") as ThreeProvider | null;
  const taskId = sp.get("taskId");
  if (!provider || !taskId) {
    return NextResponse.json(
      { error: "provider and taskId are required" },
      { status: 400 },
    );
  }
  if (provider !== "meshy" && provider !== "demo") {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  try {
    const result = await pollTask(provider, taskId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "poll failed" },
      { status: 502 },
    );
  }
}
