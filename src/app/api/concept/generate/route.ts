// POST /api/concept/generate
//
// Phase 1 concept image generation — REAL, prompt-driven, and free.
//
//   • fresh   — generate from the prompt with a new random seed (each fresh
//               take / regenerate is a genuinely different image).
//   • refine  — evolve the parent: append the requested change to the
//               parent's prompt and keep its seed, so it stays the same
//               concept, changed.
//
// The generator itself lives in lib/create/image-gen.ts, which hands back
// BYTES. Those bytes are stored (lib/create/image-store.ts) and this route
// returns a URL of our own. That is a deliberate change from the original
// design, which passed the generator's URL straight through: every free
// generator now returns either bytes or a link that expires — the AI Horde's
// is presigned for thirty minutes — while this URL is written into the
// user's localStorage chat history and rendered again days later.
//
// Runtime is nodejs rather than edge because the store writes to disk.
//
// Request:  { prompt: string, kind: "fresh" | "refine", parentImageUrl?: string }
// Response: { imageUrl: string }
//           | { error, reason: "provider-credit" | "busy" | "unreachable"
//                      | "parent-lost" } on failure, which the card turns into
//             the sentence for that reason.

import { NextResponse } from "next/server";
import {
  PROMPT_BUDGET,
  RenderError,
  generate,
  type FailReason,
} from "@/lib/create/image-gen";
import { idFromUrl, put, readMeta, urlFor } from "@/lib/create/image-store";

export const runtime = "nodejs";

/** Recover a parent's prompt and seed so a refine evolves the same concept.
 *  Our own URLs carry an id into the store; a Pollinations URL from before
 *  this change encodes them in its path, and those are still sitting in
 *  people's chats, so both are read. */
async function parentOf(
  url: string,
): Promise<{ prompt: string; seed: string } | null> {
  const id = idFromUrl(url);
  if (id) {
    const meta = await readMeta(id);
    return meta ? { prompt: meta.prompt, seed: meta.seed } : null;
  }
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
};

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
    // Composed inside enhance()'s budget rather than over it. The cut happens
    // before the boilerplate is appended, so whatever overflows is the change
    // the user just typed — and a refine chain grows the parent every time,
    // which would silently eat more of it with each pass.
    const change = prompt.slice(0, 80);
    finalPrompt = `${parent.prompt.slice(0, PROMPT_BUDGET - change.length - 2)}, ${change}`;
    seed = parent.seed; // same seed → same concept, evolved by the change
  }

  try {
    const rendered = await generate(finalPrompt, seed);
    const id = await put(rendered.bytes, {
      prompt: finalPrompt,
      seed: rendered.seed,
      provider: rendered.provider,
      contentType: rendered.contentType,
    });
    return NextResponse.json({ imageUrl: urlFor(id) });
  } catch (err) {
    const reason: FailReason =
      err instanceof RenderError ? err.reason : "unreachable";
    const copy = COPY[reason];
    return NextResponse.json(
      { error: copy.error, reason: copy.reason },
      { status: copy.status },
    );
  }
}
