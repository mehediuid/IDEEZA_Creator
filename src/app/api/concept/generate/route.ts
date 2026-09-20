// /api/concept/generate — concept image generation, free and non-blocking.
//
//   POST { prompt, kind: "fresh" | "refine", parentImageUrl? }
//        → { job }                  hands the work to the generator, returns at once
//   GET  ?job=<token>
//        → { status: "pending", queuePosition?, waitSeconds? }
//        | { status: "ready", imageUrl }
//        | { error, reason } on failure
//
// It used to block for the whole render and return the image. That works on a
// long-lived server and cannot work on a serverless host: a render measures
// 32-62s against a function budget far shorter than that, so the function is
// killed before the generator answers and the user is shown a failure for a
// render that was in fact fine. The create-then-poll shape here is the same
// one /api/three/generate already uses for the 3D provider.
//
// The job token carries everything needed to resume — provider, the
// provider's own handle, the composed prompt, the seed, the start time —
// because the invocation that starts a render is not the one that finishes
// it, and they share no memory. Nothing secret is in it: it is the user's own
// prompt, and this app has no accounts.
//
// Runtime is nodejs rather than edge because the store may touch the disk.

import { NextResponse, type NextRequest } from "next/server";
import {
  PROMPT_BUDGET,
  RenderError,
  pollRender,
  startRender,
  type FailReason,
  type RenderJob,
} from "@/lib/create/image-gen";
import { put, readMeta } from "@/lib/create/image-store";

export const runtime = "nodejs";

/** Recover a parent's prompt and seed so a refine evolves the same concept.
 *  Our own URLs carry an id into the store; a Pollinations URL from before
 *  this change encodes them in its path, and those are still sitting in
 *  people's chats, so both are read. */
async function parentOf(
  url: string,
): Promise<{ prompt: string; seed: string } | null> {
  const meta = await readMeta(url);
  if (meta) return { prompt: meta.prompt, seed: meta.seed };
  // Not ours: a Pollinations URL from before the store existed, which encodes
  // the prompt and seed in its own path.
  try {
    const u = new URL(url, "http://localhost");
    const i = u.pathname.indexOf("/prompt/");
    if (i < 0) return null;
    const raw = u.pathname.slice(i + "/prompt/".length);
    if (!raw) return null;
    return {
      prompt: decodeURIComponent(raw),
      seed: u.searchParams.get("seed") || "1",
    };
  } catch {
    return null;
  }
}

// One row per way this can fail, because the card says a different sentence
// for each and the user needs a different instruction from each.
const COPY: Record<
  FailReason,
  { error: string; reason: string; status: number }
> = {
  unpaid: {
    error:
      "The image service refused the render — the account it bills has no credit.",
    reason: "provider-credit",
    status: 402,
  },
  busy: {
    error: "Image generation is busy — try again in a moment.",
    reason: "busy",
    status: 503,
  },
  unreachable: {
    error: "Couldn't reach the image generator.",
    reason: "unreachable",
    status: 502,
  },
  storage: {
    error:
      "The image was generated, but we couldn't store it — so there is nothing to show.",
    reason: "storage",
    status: 500,
  },
};

function failed(err: unknown) {
  const reason: FailReason =
    err instanceof RenderError ? err.reason : "unreachable";
  const copy = COPY[reason];
  return NextResponse.json(
    { error: copy.error, reason: copy.reason },
    { status: copy.status },
  );
}

const encodeJob = (job: RenderJob) =>
  Buffer.from(JSON.stringify(job), "utf8").toString("base64url");

function decodeJob(token: string): RenderJob | null {
  try {
    const raw = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as Partial<RenderJob>;
    if (
      (raw.provider !== "aihorde" && raw.provider !== "pollinations") ||
      typeof raw.ref !== "string" ||
      typeof raw.prompt !== "string" ||
      typeof raw.seed !== "string" ||
      typeof raw.startedAt !== "number"
    ) {
      return null;
    }
    return raw as RenderJob;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const obj = (body ?? {}) as {
    prompt?: unknown;
    kind?: unknown;
    parentImageUrl?: unknown;
  };
  const prompt = String(obj.prompt ?? "").trim();
  const kind = obj.kind === "refine" ? "refine" : "fresh";
  const parentImageUrl =
    typeof obj.parentImageUrl === "string" && obj.parentImageUrl.length > 0
      ? obj.parentImageUrl
      : null;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (kind === "refine" && !parentImageUrl) {
    return NextResponse.json(
      { error: "parentImageUrl is required for refine" },
      { status: 400 },
    );
  }

  let finalPrompt = prompt;
  // A fresh take is a different image every time, so it gets a new seed.
  let seed = String(Math.floor(Math.random() * 1_000_000_000));
  if (kind === "refine" && parentImageUrl) {
    const parent = await parentOf(parentImageUrl);
    if (!parent) {
      // Rendering the change on its own would answer "make it matte black"
      // with a matte black anything, bill a credit for it and label it a
      // refine of a concept it has nothing to do with. Saying so is the
      // only honest answer, and it is what gets the credit refunded.
      return NextResponse.json(
        {
          error:
            "The concept this refines is no longer on the server, so there was nothing to evolve.",
          reason: "parent-lost",
        },
        { status: 409 },
      );
    }
    // Composed inside the generator's own budget rather than over it. The cut
    // lands before the boilerplate is appended, so whatever overflows is the
    // change the user just typed — and a refine chain grows the parent every
    // time, which would silently eat more of it with each pass.
    const change = prompt.slice(0, 80);
    finalPrompt = `${parent.prompt.slice(0, PROMPT_BUDGET - change.length - 2)}, ${change}`;
    seed = parent.seed; // same seed → same concept, evolved by the change
  }

  try {
    const job = await startRender(finalPrompt, seed);
    return NextResponse.json({ job: encodeJob(job) });
  } catch (err) {
    return failed(err);
  }
}

export async function GET(req: NextRequest) {
  const job = decodeJob(req.nextUrl.searchParams.get("job") ?? "");
  if (!job) {
    return NextResponse.json({ error: "Unknown job" }, { status: 400 });
  }

  try {
    const step = await pollRender(job);
    if (step.status === "pending") {
      return NextResponse.json({
        status: "pending",
        queuePosition: step.queuePosition,
        waitSeconds: step.waitSeconds,
      });
    }
    // Stored on the way through: the generator's own link is presigned and
    // dies within the hour, while this URL goes into the user's chat history.
    // Its own try: a failure here is OURS, and collapsing it into the
    // provider's reason told users the service was unreachable when it had
    // just done the work.
    let stored: { url: string };
    try {
      stored = await put(step.rendered.bytes, {
        prompt: job.prompt,
        seed: step.rendered.seed,
        provider: step.rendered.provider,
        contentType: step.rendered.contentType,
      });
    } catch {
      return failed(new RenderError("storage"));
    }
    return NextResponse.json({ status: "ready", imageUrl: stored.url });
  } catch (err) {
    return failed(err);
  }
}
