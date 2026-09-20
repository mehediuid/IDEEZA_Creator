// POST /api/concept/generate
//
// Phase 1 concept image generation — REAL, prompt-driven, via Pollinations.
// The returned image actually reflects the prompt.
//
// Rendering a NEW image is no longer anonymous: Pollinations bills each
// generation against an account balance and refuses an unauthenticated
// caller with 402 INSUFFICIENT_BALANCE (wrapped in its own 500). So the
// warm request carries POLLINATIONS_TOKEN when one is set, the same
// env-key-or-degrade shape the 3D module's MESHY_API_KEY uses. Reading an
// image it has ALREADY rendered is still free and unauthenticated, which
// is why the browser can load the returned URL with no token of its own.
//
//   • fresh   — generate from the prompt with a new random seed (each fresh
//               take / regenerate is a genuinely different image).
//   • refine  — evolve the parent: append the requested change to the parent's
//               prompt and keep its seed, so it stays the same concept, changed.
//
// We "warm" the image server-side (wait until Pollinations has actually
// rendered it) before returning the URL, so the UI's existing pending → ready
// flow shows the shimmer until the image is genuinely available, then the
// <img> loads it from the CDN cache instantly.
//
// Request:  { prompt: string, kind: "fresh" | "refine", parentImageUrl?: string }
// Response: { imageUrl: string }
//           | { error, reason: "provider-credit" | "busy" } on failure,
//             which the card turns into the sentence for that reason.

import { NextResponse } from "next/server";

export const runtime = "edge";

const POLLINATIONS = "https://image.pollinations.ai/prompt";
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 35_000;

/** Why a render did not happen. The two are different to the user: one
 *  clears by itself, the other cannot be retried into working. */
type WarmResult = "ok" | "busy" | "unpaid";

// Server-side only. The token must never reach the returned URL — that URL
// is stored in the chat and loaded by the browser, so a token in its query
// string would be handed to every reader of the thread.
function authHeaders(): Record<string, string> {
  const token = process.env.POLLINATIONS_TOKEN?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function enhance(prompt: string): string {
  return `${prompt.slice(0, 320)}, product concept render, photoreal, high detail, clean studio background, no text`;
}

function pollinationsUrl(prompt: string, seed: string | number): string {
  return `${POLLINATIONS}/${encodeURIComponent(prompt.slice(0, 400))}?width=640&height=480&nologo=true&model=flux&seed=${seed}`;
}

// Recover the prompt + seed from a previously-issued Pollinations URL so a
// refine can evolve the same concept.
function parseParent(url: string): { prompt: string; seed: string } {
  try {
    const u = new URL(url);
    const i = u.pathname.indexOf("/prompt/");
    const raw = i >= 0 ? u.pathname.slice(i + "/prompt/".length) : "";
    return {
      prompt: raw ? decodeURIComponent(raw) : "",
      seed: u.searchParams.get("seed") || "1",
    };
  } catch {
    return { prompt: "", seed: "1" };
  }
}

// Fetch the image once so generation completes + the CDN caches it. Retries a
// busy queue (429) and a transient 5xx; a billing refusal returns at once.
async function warm(url: string): Promise<WarmResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "image/*", ...authHeaders() },
      });
      clearTimeout(timer);
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.startsWith("image/")) return "ok";
      // Pollinations reports a billing refusal as its OWN 500 carrying the
      // upstream 402 in the body, so the status alone cannot tell a busy
      // queue from a request that can never be served. Retrying this one
      // spends two minutes of spinner to arrive at the same answer.
      if (res.status === 402 || ct.includes("json")) {
        const body = await res.text().catch(() => "");
        if (res.status === 402 || /INSUFFICIENT_BALANCE|\b402\b/.test(body)) {
          return "unpaid";
        }
      }
      if (!(res.status === 429 || res.status >= 500)) return "busy";
    } catch {
      clearTimeout(timer);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(2500 * attempt);
  }
  return "busy";
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

  let finalPrompt: string;
  let seed: string | number;
  if (kind === "refine" && parentImageUrl) {
    const parent = parseParent(parentImageUrl);
    finalPrompt = parent.prompt
      ? `${parent.prompt.slice(0, 300)}, ${prompt.slice(0, 80)}`
      : enhance(prompt);
    seed = parent.seed; // same seed → same concept, evolved by the change
  } else {
    finalPrompt = enhance(prompt);
    seed = Math.floor(Math.random() * 1_000_000_000); // fresh take each time
  }

  const imageUrl = pollinationsUrl(finalPrompt, seed);
  const result = await warm(imageUrl);
  // The reason travels to the client, because "try again in a moment" and
  // "this cannot work until someone tops the account up" are different
  // instructions and the card has to give the right one.
  if (result === "unpaid") {
    return NextResponse.json(
      {
        error:
          "The image service refused the render — the account it bills has no credit.",
        reason: "provider-credit",
      },
      { status: 402 },
    );
  }
  if (result !== "ok") {
    return NextResponse.json(
      {
        error: "Image generation is busy — try again in a moment.",
        reason: "busy",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ imageUrl });
}
