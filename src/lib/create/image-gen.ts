// Concept image generation — the free generators, behind one seam.
//
// Server-only (the route imports it; nothing here runs in the browser).
//
// Every generator this app can reach for free hands back either raw bytes or
// a URL that expires, so they all return BYTES here and the caller decides
// where the image lives. That is the whole reason this file exists: the old
// code leaned on Pollinations handing out a permanent, deterministic URL
// (prompt and seed encoded in the path, re-renderable from cache forever),
// and no free replacement does that.
//
//   • aihorde       — the default, and the only one that needs NO account at
//                     all: the AI Horde is a volunteer GPU pool and accepts
//                     the shared anonymous key `0000000000`. Set
//                     AI_HORDE_API_KEY to your own free key for higher queue
//                     priority. Its result URL is a presigned R2 link with
//                     `X-Amz-Expires=1800` — thirty minutes — so the bytes
//                     must be pulled down straight away.
//   • pollinations  — kept for anyone holding a POLLINATIONS_TOKEN with
//                     balance. Anonymous generation there is billed now and
//                     refuses with 402 INSUFFICIENT_BALANCE.
//
// A generator is picked by what is configured, never by guesswork: a token
// means the user chose that provider, and the Horde is the fallback because
// it needs nothing.

export type Rendered = {
  bytes: Uint8Array;
  contentType: string;
  /** The seed actually used, so a refine can evolve the same concept. */
  seed: string;
  provider: ProviderId;
};

export type ProviderId = "aihorde" | "pollinations";

/** Why a render did not happen.
 *
 *  `unpaid` cannot be retried into working. `busy` and `unreachable` can.
 *  `storage` is ours, not the provider’s: the image was generated and then
 *  we failed to keep it. Saying "could not reach the image service" there
 *  would be a false statement, and it sends whoever debugs it at the wrong
 *  system. */
export type FailReason = "busy" | "unpaid" | "unreachable" | "storage";

export class RenderError extends Error {
  readonly reason: FailReason;
  constructor(reason: FailReason, detail?: string) {
    super(detail ? `${reason}: ${detail}` : reason);
    this.reason = reason;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function env(name: string): string | null {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : null;
}

/** Which generator this deployment will use. Exported so a surface can say
 *  so honestly rather than implying every install behaves the same. */
export function activeProvider(): ProviderId {
  return env("POLLINATIONS_TOKEN") ? "pollinations" : "aihorde";
}

/** A render in flight. Everything needed to pick it back up is in here and
 *  nothing is held in memory, because the process that starts a render is not
 *  the one that finishes it: on a serverless host each poll is a fresh
 *  invocation, and there is no shared heap between them. */
export type RenderJob = {
  provider: ProviderId;
  /** The provider’s own handle. Empty where the provider has no job to hold. */
  ref: string;
  prompt: string;
  seed: string;
  startedAt: number;
};

export type RenderProgress =
  | { status: "pending"; queuePosition?: number; waitSeconds?: number }
  | { status: "ready"; rendered: Rendered };

/** Hand the work to the provider and return at once. The caller polls. */
export function startRender(prompt: string, seed: string): Promise<RenderJob> {
  return activeProvider() === "pollinations"
    ? pollinationsStart(prompt, seed)
    : hordeStart(prompt, seed);
}

/** Has it landed? Throws RenderError when it never will. */
export function pollRender(job: RenderJob): Promise<RenderProgress> {
  if (Date.now() - job.startedAt > HORDE_BUDGET_MS) {
    throw new RenderError("busy", "the queue did not finish in time");
  }
  return job.provider === "pollinations" ? pollinationsPoll(job) : hordePoll(job);
}

/** Start and wait. Only for a caller that can block for a minute — which a
 *  serverless function cannot, so the concept route does not use this. */
export async function generate(prompt: string, seed: string): Promise<Rendered> {
  const job = await startRender(prompt, seed);
  for (;;) {
    const step = await pollRender(job);
    if (step.status === "ready") return step.rendered;
    await sleep(POLL_MS);
  }
}

/** What the generator is told beyond the user's own words: a product concept
 *  wants a clean single object, not a scene. */
const SUFFIX =
  ", product concept render, photoreal, high detail, clean studio background, no text";

/** How much of the caller's prompt survives. Exported because a refine
 *  composes a parent's prompt with the change the user just typed, and it
 *  has to do that INSIDE this budget: the cut happens before the suffix is
 *  appended, so anything over the limit is silently the newest instruction. */
export const PROMPT_BUDGET = 320;

export function enhance(prompt: string): string {
  // A prompt recovered from a legacy Pollinations URL already carries the
  // suffix inside it, and appending a second copy would spend a quarter of
  // the budget saying the same thing twice.
  const body = prompt.includes(SUFFIX) ? prompt.replace(SUFFIX, "") : prompt;
  return `${body.slice(0, PROMPT_BUDGET)}${SUFFIX}`;
}

/** The provider hands back an image over a link we do not control, so this
 *  is the one place bytes enter the process from outside. It gets what every
 *  other outbound call here has — a deadline — plus a ceiling, because the
 *  whole body is buffered into memory and the POST handler it runs under is
 *  public. 12 MB is far above any 512px render and far below trouble. */
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_BYTES = 12 * 1024 * 1024;

async function download(
  url: string,
): Promise<{ body: Uint8Array; contentType: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      throw new RenderError("unreachable", `download ${res.status}`);
    }
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      throw new RenderError("unreachable", "image too large");
    }
    const body = new Uint8Array(await res.arrayBuffer());
    // Checked again after the fact: content-length is the sender's claim, and
    // a chunked response does not carry one at all.
    if (body.byteLength > MAX_BYTES) {
      throw new RenderError("unreachable", "image too large");
    }
    return {
      body,
      contentType: res.headers.get("content-type") || "image/webp",
    };
  } catch (err) {
    if (err instanceof RenderError) throw err;
    throw new RenderError("unreachable", "could not download the image");
  } finally {
    clearTimeout(timer);
  }
}

// ───────────────────────────── AI Horde ─────────────────────────────

const HORDE = "https://stablehorde.net/api/v2";
/** The horde's own shared anonymous key. It means this app renders out of
 *  the box with nothing to sign up for, and it is the reason generation is
 *  free here at all.
 *
 *  It is also one global account (username "Anonymous#0") whose kudos sit at
 *  -50, and the horde sorts the queue by kudos — so an anonymous job waits
 *  behind every registered user, and the horde may refuse anonymous work
 *  outright under heavy load. HORDE_BUDGET_MS is what keeps that from
 *  becoming an endless spinner: past two minutes the render fails as "busy"
 *  and the card says so.
 *
 *  The fix costs nothing: aihorde.net/register issues a pseudonymous key for
 *  a display name alone — no email, no OAuth, no card — and kudos cannot be
 *  bought, so there is no paid tier behind it. Put it in AI_HORDE_API_KEY. */
const ANON_KEY = "0000000000";
/** Multiples of 64 — the horde rejects anything else — and both sides kept
 *  under 590, which is the real constraint for an anonymous caller: the
 *  horde floats its resolution cap with load
 *  (max_res = 1024 + threads*10 - queue*0.9, clamped to [576, 1024]) and
 *  refuses anything larger with 403 KudosUpfront, so a 640-wide request is
 *  fine at 3am and rejected at peak. 512x384 keeps the 4:3 shape the card
 *  was already cropping to 16:10, so the framing is unchanged. */
const WIDTH = 512;
const HEIGHT = 384;
/** Where a floating cap has pushed even 512 out of reach. Both /64. */
const FALLBACK_WIDTH = 448;
const FALLBACK_HEIGHT = 320;
/** Photoreal checkpoints. Naming several widens the pool of eligible
 *  workers, so a busy model does not stall the render.
 *
 *  Flux.1-Schnell is on the horde and follows a prompt markedly better than
 *  any of these, and it is deliberately NOT in this list: on the same prompt
 *  it took 244s against roughly 60s for the set below, and a concept someone
 *  waits four minutes for is not a concept they iterate on. It also returns
 *  a SamplerMismatch warning for the sampler used here, so the two families
 *  cannot share one request anyway. */
const MODELS = [
  "ICBINP - I Can't Believe It's Not Photography",
  "AbsoluteReality",
  "Deliberate",
  "stable_diffusion",
];
/** Past this the user has been watching a progress card for too long. */
const HORDE_BUDGET_MS = 120_000;
const POLL_MS = 2_000;

type HordeCheck = {
  done?: boolean;
  faulted?: boolean;
  is_possible?: boolean;
  wait_time?: number;
  queue_position?: number;
};

type HordeStatus = {
  generations?: { img?: string; seed?: string; state?: string }[];
};

async function hordeFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 30_000);
  try {
    return await fetch(`${HORDE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        apikey: env("AI_HORDE_API_KEY") ?? ANON_KEY,
        "Content-Type": "application/json",
        "Client-Agent": "ideeza-creator:1.0:github.com/mehediuid",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function submitBody(prompt: string, seed: string, w: number, h: number) {
  return JSON.stringify({
    prompt: enhance(prompt),
    models: MODELS,
    nsfw: false,
    // A concept render is never the point of an NSFW request, and asking
    // for SFW widens the set of workers willing to take the job.
    censor_nsfw: true,
    r2: true,
    // Not optional for an anonymous caller: with slow_workers false the
    // horde refuses even a 512px job with 403 KudosUpfront, because it
    // then has to reserve the kudos up front.
    slow_workers: true,
    params: {
      width: w,
      height: h,
      steps: 25,
      n: 1,
      cfg_scale: 7,
      karras: true,
      sampler_name: "k_euler_a",
      seed,
    },
  });
}

/** The horde accepts two submissions a second and answers a third with
 *  429 {"message":"2 per 1 second"}. A multi-product build starts every
 *  product at once, so this is reached by design rather than by abuse — and
 *  a published rate limit is something to wait out, not a failed render. */
const SUBMIT_ATTEMPTS = 4;
const SUBMIT_BACKOFF_MS = 900;

async function hordeStart(prompt: string, seed: string): Promise<RenderJob> {
  let res: Response;
  try {
    res = await hordeFetch("/generate/async", {
      method: "POST",
      body: submitBody(prompt, seed, WIDTH, HEIGHT),
    });
    for (let attempt = 1; attempt < SUBMIT_ATTEMPTS && res.status === 429; attempt += 1) {
      await sleep(SUBMIT_BACKOFF_MS * attempt);
      res = await hordeFetch("/generate/async", {
        method: "POST",
        body: submitBody(prompt, seed, WIDTH, HEIGHT),
      });
    }
    if (res.status === 403) {
      // The cap floats with load, so the same size that worked an hour ago
      // can be refused now. One smaller attempt is worth more to the user
      // than a failure card.
      const body = await res.text().catch(() => "");
      if (/KudosUpfront/i.test(body)) {
        res = await hordeFetch("/generate/async", {
          method: "POST",
          body: submitBody(prompt, seed, FALLBACK_WIDTH, FALLBACK_HEIGHT),
        });
      } else {
        throw new RenderError("unreachable", body.slice(0, 200));
      }
    }
  } catch (err) {
    if (err instanceof RenderError) throw err;
    throw new RenderError("unreachable", "could not reach the horde");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // 429 is the horde's own rate limit; anything else at submit time is a
    // refusal we cannot poll our way out of.
    throw new RenderError(res.status === 429 ? "busy" : "unreachable", body.slice(0, 200));
  }

  const submitted = (await res.json().catch(() => ({}))) as { id?: string };
  if (!submitted.id) throw new RenderError("unreachable", "no job id");
  return {
    provider: "aihorde",
    ref: submitted.id,
    prompt,
    seed,
    startedAt: Date.now(),
  };
}

async function hordePoll(job: RenderJob): Promise<RenderProgress> {
  let check: HordeCheck;
  try {
    const r = await hordeFetch(`/generate/check/${job.ref}`);
    check = (await r.json()) as HordeCheck;
  } catch {
    // A dropped poll is not a failed render; the next one will say.
    return { status: "pending" };
  }
  if (check.faulted) throw new RenderError("unreachable", "the job faulted");
  // `is_possible` false means no worker on the network can serve this job —
  // waiting cannot fix it, so say so now rather than at the deadline.
  if (check.is_possible === false) {
    throw new RenderError("busy", "no worker can serve this request");
  }
  if (!check.done) {
    // Real queue information, so the card can stop guessing.
    return {
      status: "pending",
      queuePosition: check.queue_position,
      waitSeconds: check.wait_time,
    };
  }

  // Guarded like the check above: the render has already been paid for in
  // GPU time by then, so one bad response here must not discard it.
  let status: HordeStatus;
  try {
    const r = await hordeFetch(`/generate/status/${job.ref}`);
    status = (await r.json()) as HordeStatus;
  } catch {
    return { status: "pending" };
  }
  const gen = status.generations?.[0];
  if (!gen?.img) return { status: "pending" };

  // The img field is a presigned URL that dies in thirty minutes, so this
  // download is not an optimisation — it is the only chance to keep it.
  const bytes = await download(gen.img);
  return {
    status: "ready",
    rendered: {
      bytes: bytes.body,
      contentType: bytes.contentType,
      seed: gen.seed || job.seed,
      provider: "aihorde",
    },
  };
}

// ──────────────────────────── Pollinations ───────────────────────────

const POLLINATIONS = "https://image.pollinations.ai/prompt";

export function pollinationsUrl(prompt: string, seed: string): string {
  return `${POLLINATIONS}/${encodeURIComponent(prompt.slice(0, 400))}?width=640&height=480&nologo=true&model=flux&seed=${seed}`;
}

/** Pollinations has no job to submit: its URL is deterministic, so the same
 *  GET both starts the render and collects it. Polling the same URL is
 *  therefore the whole mechanism — each attempt is given a short deadline so
 *  no single poll outlives its own serverless invocation. */
async function pollinationsStart(
  prompt: string,
  seed: string,
): Promise<RenderJob> {
  return {
    provider: "pollinations",
    ref: "",
    prompt,
    seed,
    startedAt: Date.now(),
  };
}

const POLLINATIONS_ATTEMPT_MS = 12_000;

async function pollinationsPoll(job: RenderJob): Promise<RenderProgress> {
  const url = pollinationsUrl(enhance(job.prompt), job.seed);
  const seed = job.seed;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), POLLINATIONS_ATTEMPT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "image/*",
        // The token rides the header, never the URL: the URL is theirs, not
        // ours, and we do not hand a secret to a third party in a query
        // string that lands in their logs.
        Authorization: `Bearer ${env("POLLINATIONS_TOKEN")}`,
      },
    });
  } catch {
    clearTimeout(timer);
    // A timed-out attempt means it is still rendering, not that it failed:
    // the next poll hits the same deterministic URL, warm.
    return { status: "pending" };
  }
  clearTimeout(timer);

  const ct = res.headers.get("content-type") || "";
  if (res.ok && ct.startsWith("image/")) {
    return {
      status: "ready",
      rendered: {
        bytes: new Uint8Array(await res.arrayBuffer()),
        contentType: ct,
        seed,
        provider: "pollinations",
      },
    };
  }
  // A billing refusal arrives as their own 500 carrying the upstream 402, so
  // the status alone cannot tell it from a busy queue.
  const body = await res.text().catch(() => "");
  if (res.status === 402 || /INSUFFICIENT_BALANCE/.test(body)) {
    throw new RenderError("unpaid", body.slice(0, 200));
  }
  throw new RenderError(
    res.status === 429 || res.status >= 500 ? "busy" : "unreachable",
    body.slice(0, 200),
  );
}
