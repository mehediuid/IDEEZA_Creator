// A product's video on the phone (mobile Figma "Project Details · 2026 update"
// rows 11–11za): what the web's Generate video, its review and its render
// toasts already decide, said the phone's way — the render tray's one item at
// a time (11l–11o), the AR camera's clip kept as a take (11c, 11d), the
// camera's troubles in words (11t). The web's stores, reducers and words stay
// theirs (product-video, jobs, video-copy); this spells only the phone's
// choices.
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import { phoneProductVideoHref } from "../manual/phone-earn";
import { phoneProjectHref } from "../manual/phone-project";
import { etaLabel, progressOf, type VideoJob } from "./jobs";
import * as pv from "./product-video";
import { FAILURE_COPY, clockOf, moreToastsLine } from "./video-copy";
import { PROJECT_VIDEO_KEY, type OnScreenLines, type ProductVideo, type ProductVideoStatus, type VideoFailureKind, type VideoQuality } from "./types";

const enc = encodeURIComponent;

// ─────────────────────────── addresses ───────────────────────────

/** A finished take's review on the Generate video screen (11b), or the form filled from a take
 *  (a failed render's Try again). */
export function phoneTakeHref(projectId: string, productId: string, take: { review: string } | { from: string }): string {
  const q = "review" in take ? `review=${enc(take.review)}` : `from=${enc(take.from)}`;
  return `${phoneProductVideoHref(projectId, productId)}?${q}`;
}

/** Where a product's video action (Generate AI video · Review · Try again) opens on the phone, as
 *  the web's readiness row opens Generate video over its dialog: a take waiting for review opens
 *  on it; anything else opens the product's Generate video screen, which shows what it has (the
 *  form, or the failed take). Never the product's page: the video isn't made there. */
export function phoneVideoActionHref(projectId: string, productId: string, video: ProductVideoStatus): string {
  const waiting = video.state === "review" ? video.take : video.state === "ready" ? video.review : undefined;
  return waiting ? phoneTakeHref(projectId, productId, { review: waiting.id }) : phoneProductVideoHref(projectId, productId);
}

/** The phone's Project video screen (03d), on a take's review when given. */
export function phoneProjectVideoHref(projectId: string, reviewId?: string): string {
  return `/m/projects/${enc(projectId)}/video${reviewId ? `?review=${enc(reviewId)}` : ""}`;
}

// ─────────────────────────── the render tray (11l–11o) ───────────────────────────

export type TrayTone = "progress" | "success" | "error" | "info";

export type TrayAction =
  | { kind: "go"; label: string; href: string }
  /** Cancel: asks first (11y). */
  | { kind: "cancel"; label: string; takeId: string; n: number };

export type TrayItem = {
  key: string;
  /** The job's id; null for the nudge. */
  jobId: string | null;
  tone: TrayTone;
  title: string;
  supporting: string;
  /** 0–100 while it renders, else null. */
  progress: number | null;
  action: TrayAction | null;
};

/** What the tray needs to know about a job beside the job itself. */
export type TrayJobFacts = {
  /** The take's number ("Take 2"); the job's own facts don't carry it. */
  n: number;
  /** The product's display name; the project's name for a project video. */
  name: string;
  /** The finished take still waits for the maker's word (Review rather than Watch). */
  waiting: boolean;
  /** The maker may still render for this project (not sold in full): Try again is offered. */
  renderable: boolean;
  /** The take's failure, when the job failed. */
  failure: VideoFailureKind | null;
  /** The clip's length once made. */
  durationMs: number | null;
};

/** "60 % · about 1 min left" — the web's percent spelling ("Rendering · 40 %"). */
export function trayProgressLine(total: number, etaSec: number): string {
  return `${Math.round(total)} % · ${etaLabel(etaSec)} left`;
}

/** One render job as the tray says it (11l rendering, 11m ready, 11n failed). A legacy job (no
 *  product) or one with no project is null: the phone has nowhere to send it. */
export function trayItemOf(job: VideoJob, facts: TrayJobFacts, now: number): TrayItem | null {
  if (!job.projectId || !job.productId || !job.render) return null;
  const projectId = job.projectId;
  const productId = job.productId;
  const isProject = productId === PROJECT_VIDEO_KEY;
  const base = { key: job.id, jobId: job.id };
  if (job.stage === "done") {
    const seconds = facts.durationMs ? Math.round(facts.durationMs / 1000) : 10;
    const href = facts.waiting
      ? isProject
        ? phoneProjectVideoHref(projectId, job.id)
        : phoneTakeHref(projectId, productId, { review: job.id })
      : phoneProjectHref(projectId, "media");
    return {
      ...base,
      tone: "success",
      title: `Take ${facts.n} is ready`,
      supporting: `${isProject ? "Project video" : facts.name} · ${seconds} seconds`,
      progress: null,
      action: { kind: "go", label: facts.waiting ? "Review" : "Watch", href },
    };
  }
  if (job.stage === "failed") {
    const kind = facts.failure ?? "interrupted";
    return {
      ...base,
      tone: "error",
      title: `Take ${facts.n} couldn’t be made`,
      supporting: `${isProject ? "Project video" : facts.name} · ${FAILURE_COPY[kind]}`,
      progress: null,
      action: facts.renderable
        ? {
            kind: "go",
            label: "Try again",
            href: isProject ? phoneProjectVideoHref(projectId) : phoneTakeHref(projectId, productId, { from: job.id }),
          }
        : null,
    };
  }
  const { total, etaSec } = progressOf(job, now);
  return {
    ...base,
    tone: "progress",
    title: isProject ? `Rendering the project video · Take ${facts.n}` : `Rendering ${facts.name} · Take ${facts.n}`,
    supporting: trayProgressLine(total, etaSec),
    progress: total,
    action: { kind: "cancel", label: "Cancel", takeId: job.id, n: facts.n },
  };
}

/** 11o: every current product has its video, so the project video can be made (or updated). */
export function trayNudgeOf(projectId: string, total: number, update: boolean): TrayItem {
  return {
    key: `nudge:${projectId}`,
    jobId: null,
    tone: "info",
    title: total === 1 ? "Your product video is ready" : `All ${total} product videos are ready`,
    supporting: `${update ? "Update" : "Make"} the project video from ${total === 1 ? "it" : "them"}.`,
    progress: null,
    action: { kind: "go", label: update ? "Update project video" : "Make project video", href: phoneProjectVideoHref(projectId) },
  };
}

/** One item at a time (the kit's toast rule): a nudge first, then the newest job; the rest wait
 *  behind the web's "+N more videos" line. */
export function trayStackOf(nudges: TrayItem[], jobsNewestFirst: TrayItem[]): { shown: TrayItem | null; more: string | null } {
  const all = [...nudges, ...jobsNewestFirst];
  const shown = all[0] ?? null;
  return { shown, more: all.length > 1 ? moreToastsLine(all.length - 1) : null };
}

/** Where the tray stays out of the way: the camera, a buyer's view (the market, a preview), and —
 *  for that one product or the project video — the screen already showing its render. */
export function trayHiddenFor(pathname: string, job: Pick<VideoJob, "projectId" | "productId"> | null): boolean {
  const m = /^\/m\/projects\/([^/?#]+)(\/.*)?$/.exec(pathname);
  if (!m) return false;
  const rest = m[2] ?? "";
  if (/^\/(market|preview)(\/|$)/.test(rest)) return true;
  if (/^\/products\/[^/]+\/ar$/.test(rest)) return true;
  if (!job) return false;
  const projectId = decodeURIComponent(m[1]);
  if (job.projectId !== projectId) return false;
  const product = /^\/products\/([^/]+)\/video$/.exec(rest);
  if (product) return decodeURIComponent(product[1]) === job.productId;
  return rest === "/video" && job.productId === PROJECT_VIDEO_KEY;
}

// ─────────────────────────── the AR clip (11c, 11d) ───────────────────────────

/** A clip is 10 seconds; the camera stops itself there. */
export const RECORD_MS = 10_000;

/** "0:04 of 0:10". */
export function recordClock(ms: number): string {
  return `${clockOf(Math.min(RECORD_MS, Math.max(0, ms)))} of ${clockOf(RECORD_MS)}`;
}

/** The recorder's format: the first the phone can write, MP4 before WebM (Safari writes MP4 only);
 *  "" lets the recorder pick its own. */
export function pickRecorderMime(supported: (mime: string) => boolean): string {
  for (const m of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (supported(m)) return m;
  }
  return "";
}

/** A recording's quality on the take: 720p and up reads as High, anything less as Low. */
export function qualityOfHeight(height: number): VideoQuality {
  return height >= 720 ? "high" : "low";
}

export type CameraTrouble = "denied" | "busy" | "missing" | "unsupported";

/** Why the camera didn't open, from the browser's error name. */
export function cameraTroubleOf(name: string | null | undefined): CameraTrouble {
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "denied";
  // In use by another app, or a hiccup while it opened: trying again can work.
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "missing";
  return "unsupported";
}

/** 11t's words, per trouble; each ends on the way out that always works — upload a clip. */
export const CAMERA_TROUBLE_COPY: Record<CameraTrouble, { title: string; text: string }> = {
  denied: {
    title: "The camera is off for IDEEZA",
    text: "Turn on Camera for this site in your browser’s settings, then try again. Or upload a clip you already have.",
  },
  busy: { title: "The camera is busy", text: "Another app may be using it. Close that app and try again, or upload a clip you already have." },
  missing: { title: "There’s no camera to record with", text: "This phone’s camera isn’t available right now. Upload a clip you already have." },
  unsupported: { title: "This phone can’t record here", text: "Recording isn’t available in this browser. Upload a clip you already have." },
};

/** Try again is worth offering: the camera was turned off, busy or not found — not a browser that can't record. */
export function cameraCanRetry(trouble: CameraTrouble): boolean {
  return trouble !== "unsupported";
}

/** The camera's two sides: the back one (the product) first; Flip switches. */
export type CameraFacing = "environment" | "user";

export function flipFacing(facing: CameraFacing): CameraFacing {
  return facing === "environment" ? "user" : "environment";
}

/** The flash is the camera's torch, where its track has one (never the front camera). */
export const FLASH_UNAVAILABLE = "Flash isn’t available on this camera";

export function flashLabel(can: boolean, on: boolean): string {
  return !can ? FLASH_UNAVAILABLE : on ? "Turn the flash off" : "Turn the flash on";
}

/** Said once when a clip records with no microphone (turned off, or Not now). */
export const SILENT_CLIP = "Recording without sound. The microphone is off.";

/** How a kept clip was made: with this phone's camera, or picked from its videos. */
export type ClipOrigin = "camera" | "upload";

/** The phone's own note of which takes are clips it recorded or uploaded (not rendered by AI),
 *  so their review and meta line say so. Keyed by take id. */
export const RECORDED_KEY = "ideeza:m:recorded-takes";

export function parseRecorded(raw: string | null): Record<string, ClipOrigin> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, ClipOrigin> = {};
    for (const [id, how] of Object.entries(value)) if (how === "camera" || how === "upload") out[id] = how;
    return out;
  } catch {
    return {};
  }
}

/** The note with this take added, and any take no longer kept dropped. */
export function withRecorded(map: Record<string, ClipOrigin>, takeId: string, how: ClipOrigin, keep: ReadonlySet<string> | null = null): Record<string, ClipOrigin> {
  const out: Record<string, ClipOrigin> = {};
  for (const [id, h] of Object.entries(map)) if (!keep || keep.has(id)) out[id] = h;
  out[takeId] = how;
  return out;
}

/** "10-second clip · Recorded on this phone · 28 Oct 2026". */
export function clipMetaOf(durationMs: number, how: ClipOrigin, madeOn: string): string {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${seconds}-second clip · ${how === "camera" ? "Recorded on" : "Uploaded from"} this phone · ${madeOn}`;
}

export type KeptClip = { mime: string; width: number; height: number; durationMs: number; bytes: number };

/** The clip as a new take of the product: numbered like any take, finished at once (no render),
 *  waiting for the maker's word — or, with `use`, the product's video straight away (Use this
 *  clip). Past five takes the oldest not in use goes; `evicted` names it so its file goes too. */
export function addClipTake(
  v: ProductVideo | undefined,
  input: { productId: string; takeId: string; lines: OnScreenLines; clip: KeptClip; use: boolean },
  now: number,
): { video: ProductVideo; evicted: string[]; n: number } {
  const started = pv.startTake(
    v,
    { productId: input.productId, prompt: "", lines: input.lines, quality: qualityOfHeight(input.clip.height), source: null },
    now,
    input.takeId,
  );
  let video = pv.finishTake(started.video, input.takeId, input.clip, now);
  if (input.use) video = pv.useTake(video, input.takeId);
  const n = video.takes.find((t) => t.id === input.takeId)?.n ?? 0;
  return { video, evicted: started.evicted, n };
}
