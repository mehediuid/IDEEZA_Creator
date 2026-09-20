// Server-side helpers for the AI image→3D pipeline (used by
// /api/three/generate). Provider-agnostic so the surface stays the same
// regardless of who actually renders the mesh:
//
//   • "meshy" — real image-to-3D (Meshy, free monthly credits). Returns a
//               hosted .glb. Enabled when MESHY_API_KEY is set.
//   • "demo"  — no key required. Returns the bundled /models/sample.glb so the
//               whole flow (prompt → concept image → 3D viewer) is visible and
//               testable immediately, with a short simulated "generating" pass.
//
// A text prompt is first turned into a concept image by the same free
// generator the concept chat uses (lib/create/image-gen.ts — the AI Horde by
// default, no account needed), and the bytes are stored by lib/create/
// image-store.ts, so this module and the chat produce the same kind of URL.
// That image is then fed to image-to-3D. Image-to-3D is one reliable call (vs. Meshy's two-step
// text-to-3D), so this path is simpler AND keeps the image step free.

import { generate } from "@/lib/create/image-gen";
import { put } from "@/lib/create/image-store";

export type ThreeProvider = "meshy" | "demo";
export type TaskStatus = "queued" | "generating" | "ready" | "failed";

export type CreateResult = {
  provider: ThreeProvider;
  taskId: string;
  // The concept image the model is built from (shown in the UI while the mesh
  // renders, and reused on a Regenerate).
  imageUrl: string;
};

export type PollResult = {
  status: TaskStatus;
  progress: number; // 0–100
  glbUrl?: string;
  error?: string;
};


// ─────────────────────────── concept image ─────────────────────────────

function enhanceForModel(prompt: string): string {
  // A clean, centered, single object on a plain background gives image-to-3D
  // the best chance at a coherent mesh.
  return `${prompt.slice(0, 200)}, single product, centered, full object in frame, plain seamless studio background, soft even lighting`;
}

/** Render a concept image and keep it. Returns the app-relative URL, the same
 *  shape the concept chat stores — see image-store.ts for why the bytes are
 *  ours rather than the provider's link. */
export async function renderConceptImage(prompt: string): Promise<string> {
  const rendered = await generate(
    enhanceForModel(prompt),
    String(Math.floor(Math.random() * 1_000_000_000)),
  );
  const stored = await put(rendered.bytes, {
    prompt,
    seed: rendered.seed,
    provider: rendered.provider,
    contentType: rendered.contentType,
  });
  return stored.url;
}

/** Meshy fetches the image from its own servers, so it needs an absolute URL
 *  it can actually reach. Our images are served from this app, so the caller
 *  has to say where this app is. */
function absolute(url: string, origin: string | undefined): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (!origin) {
    throw new Error(
      "image-to-3D needs an absolute image URL — pass the request origin",
    );
  }
  return new URL(url, origin).toString();
}


// ─────────────────────────── Meshy provider ────────────────────────────

const MESHY_BASE = "https://api.meshy.ai/openapi/v1/image-to-3d";

function meshyKey(): string | null {
  const k = process.env.MESHY_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

export function activeProvider(): ThreeProvider {
  return meshyKey() ? "meshy" : "demo";
}

async function meshyCreate(imageUrl: string): Promise<string> {
  const key = meshyKey();
  if (!key) throw new Error("no meshy key");
  const res = await fetch(MESHY_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      enable_pbr: true,
      should_texture: true,
      should_remesh: true,
      topology: "triangle",
    }),
  });
  if (!res.ok) {
    throw new Error(`meshy create ${res.status}: ${await safeText(res)}`);
  }
  const data = (await res.json()) as { result?: string; id?: string };
  const id = data.result ?? data.id;
  if (!id) throw new Error("meshy create: missing task id");
  return id;
}

async function meshyPoll(taskId: string): Promise<PollResult> {
  const key = meshyKey();
  if (!key) return { status: "failed", progress: 0, error: "no meshy key" };
  const res = await fetch(`${MESHY_BASE}/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    return {
      status: "failed",
      progress: 0,
      error: `meshy poll ${res.status}`,
    };
  }
  const data = (await res.json()) as {
    status?: string;
    progress?: number;
    model_urls?: Record<string, string | undefined>;
    task_error?: { message?: string };
  };
  const status = (data.status ?? "").toUpperCase();
  const progress = clampPct(data.progress ?? 0);
  if (status === "SUCCEEDED") {
    const glb = data.model_urls?.glb;
    if (!glb) return { status: "failed", progress, error: "no glb in result" };
    return { status: "ready", progress: 100, glbUrl: glb };
  }
  if (status === "FAILED" || status === "CANCELED" || status === "EXPIRED") {
    return {
      status: "failed",
      progress,
      error: data.task_error?.message ?? "generation failed",
    };
  }
  // PENDING / IN_PROGRESS / anything else still cooking.
  return { status: "generating", progress: Math.max(5, progress) };
}

// ─────────────────────────── demo provider ─────────────────────────────

const SAMPLE_GLB = "/models/sample.glb";
const DEMO_RENDER_MS = 6000; // feels like a short render, no external call

function demoPoll(taskId: string): PollResult {
  // taskId = "demo:<startMs>" — derive a believable progress curve from elapsed
  // time so the UI shows a "generating…" pass before the model appears.
  const start = Number(taskId.split(":")[1] ?? "0");
  const elapsed = start > 0 ? Date.now() - start : DEMO_RENDER_MS;
  if (elapsed >= DEMO_RENDER_MS) {
    return { status: "ready", progress: 100, glbUrl: SAMPLE_GLB };
  }
  const progress = clampPct(10 + (elapsed / DEMO_RENDER_MS) * 85);
  return { status: "generating", progress };
}

// ─────────────────────────── public API ────────────────────────────────

// Create a generation task. Resolves the concept image first (provided or
// freshly generated), then hands it to the active provider.
export async function createTask(input: {
  prompt?: string;
  imageUrl?: string;
  seed?: number;
  /** Where this app is reachable, for the provider that fetches the image. */
  origin?: string;
}): Promise<CreateResult> {
  let imageUrl = input.imageUrl?.trim() || "";
  if (!imageUrl) {
    const prompt = (input.prompt ?? "").trim();
    if (!prompt) throw new Error("need a prompt or an image");
    imageUrl = await renderConceptImage(prompt);
  }

  const provider = activeProvider();
  if (provider === "meshy") {
    // Meshy fetches the image itself, so a path relative to this app is no
    // use to it — and every concept image is now served from this app.
    // Honest limit: on a host the outside world cannot reach (localhost, a
    // private network) there is no URL that works, and Meshy will fail.
    const taskId = await meshyCreate(absolute(imageUrl, input.origin));
    return { provider, taskId, imageUrl };
  }
  // Demo: return instantly so the UI can show the concept image right away
  // (the browser renders it from the same deterministic URL). No server warm.
  return { provider: "demo", taskId: `demo:${Date.now()}`, imageUrl };
}

// Poll a previously-created task.
export async function pollTask(
  provider: ThreeProvider,
  taskId: string,
): Promise<PollResult> {
  if (provider === "meshy") return meshyPoll(taskId);
  return demoPoll(taskId);
}

// ─────────────────────────── small utils ───────────────────────────────

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}
