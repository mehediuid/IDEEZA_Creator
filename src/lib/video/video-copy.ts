// The words every video surface shares (Phase 2 VIDEO §2: P2-VIDEO-2, 4, 6,
// 8, 9, 10, 14). One table per thing, so the Media tab, the product page, the
// readiness dialog, the Generate dialog and the render toasts can't word the
// same state two ways. Pure, relative imports only.

import { STAGE_LABELS, STAGE_ORDER, type VideoJobStage } from "./jobs";
import {
  VIDEO_QUALITY,
  type ProductVideoStatus,
  type VideoFailureKind,
  type VideoQuality,
  type VideoTake,
} from "./types";
import type { ReadinessPurpose } from "../manual/p2-types";

/** P2-VIDEO-2's failure kinds, word for word. */
export const FAILURE_COPY: Record<VideoFailureKind, string> = {
  unsupported: "This browser can't make video files. Try a recent Chrome, Edge or Safari.",
  storage: "There's no room to store the video in this browser. Free some space, then try again.",
  encode: "The video couldn't be made. Try again.",
  interrupted: "The render stopped before it finished.",
  cancelled: "You cancelled this render.",
  lost: "This video isn't stored in this browser any more.",
};

/** The honesty line (P2-VIDEO-2): on every surface that makes or plays a clip. */
export function honestyLine(productName: string): string {
  return `Made in this browser from ${productName}'s image and on-screen text — the AI video model isn't connected yet. Your prompt is kept with the video.`;
}

export const SILENT_NOTE = "The video is silent.";
export const CANNOT_PLAY_COPY = "This browser can't play this video file.";
export const PROMPT_BLOCKER = "Write what the video should show.";
export const HIGH_LOCKED_NOTE = "720p comes with the Builder plan, which isn't on sale yet.";
export const PROMPT_PLACEHOLDER = "Describe the shot — the product, the setting, how the camera moves";
export const RENDER_KEEPS_RUNNING = "You can close this — the render keeps running, and its progress shows in the corner.";
export const NO_VIDEO_PRODUCT =
  "No video yet — every product needs one before the project can be showcased, sold or given.";
export const LINE_MAX = 60;

export function resolutionOf(q: VideoQuality): string {
  return VIDEO_QUALITY[q].resolution;
}

/** "Rider · Car" — the render's title on its toast and in the dialog's description. */
export function renderTitle(productName: string, projectName: string): string {
  return `${productName} · ${projectName}`;
}

/** "Take 2 · Stage 3 of 5 · Rendering frames" (P2-VIDEO-6's render view). */
export function stageLine(n: number, stage: VideoJobStage): string {
  const i = STAGE_ORDER.indexOf(stage);
  const at = i === -1 ? STAGE_ORDER.length : i + 1;
  return `Take ${n} · Stage ${at} of ${STAGE_ORDER.length} · ${STAGE_LABELS[stage]}`;
}

/** "10-second silent clip · 360p · Take 2 · Made 29 Sep 2026" (P2-VIDEO-9). */
export function clipMetaLine(take: Pick<VideoTake, "n" | "quality">, madeOn: string): string {
  return `10-second silent clip · ${resolutionOf(take.quality)} · Take ${take.n} · Made ${madeOn}`;
}

/** "Take 2 · 360p · 29 Sep 2026" (P2-VIDEO-8's Takes list). */
export function takeLabel(take: Pick<VideoTake, "n" | "quality">, on: string): string {
  return `Take ${take.n} · ${resolutionOf(take.quality)} · ${on}`;
}

export type StatusCopy = {
  /** The status text, e.g. "Rendering · 40 %". */
  text: string;
  /** The line under it: "about 1 min left", or the failure copy. */
  sub: string | null;
  tone: "error" | "neutral" | "success";
  icon: "cross" | "spinner" | "check" | "alert";
  /** The owner's action in this state (none while rendering or ready). */
  action: "generate" | "retry" | null;
  /** 0–100 while something renders, else null. */
  progress: number | null;
};

/** P2-VIDEO-4's one table. Every state carries words and an icon, never colour alone. */
export function statusCopy(status: ProductVideoStatus): StatusCopy {
  switch (status.state) {
    case "none":
      return { text: "No video yet", sub: null, tone: "error", icon: "cross", action: "generate", progress: null };
    case "rendering":
      return {
        text: `Rendering · ${Math.round(status.progress)} %`,
        sub: `${status.eta} left`,
        tone: "neutral",
        icon: "spinner",
        action: null,
        progress: status.progress,
      };
    case "ready":
      return status.next
        ? {
            text: `Video ready · Take ${status.next.take.n} rendering ${Math.round(status.next.progress)} %`,
            sub: null,
            tone: "success",
            icon: "check",
            action: null,
            progress: null,
          }
        : { text: "Video ready", sub: null, tone: "success", icon: "check", action: null, progress: null };
    case "failed":
      return {
        text: "Render failed",
        sub: FAILURE_COPY[status.failure],
        tone: "error",
        icon: "alert",
        action: "retry",
        progress: null,
      };
  }
}

/** The owner's action label for a state (P2-VIDEO-4 / P2-VIDEO-7). */
export function actionLabel(action: StatusCopy["action"]): string | null {
  return action === "generate" ? "Generate AI video" : action === "retry" ? "Try again" : null;
}

export type ReadinessCopy = { title: string; info: string; cta: string };

/** P2-VIDEO-14's table, with §4.3's two added purposes. */
export function readinessCopy(purpose: ReadinessPurpose, productName = "This product"): ReadinessCopy {
  switch (purpose) {
    case "showcase":
      return {
        title: "Showcase project",
        info: "To showcase this project, every product needs an AI video.",
        cta: "Showcase project",
      };
    case "sell":
      return {
        title: "Add to marketplace",
        info: "To add this project to the marketplace, every product needs an AI video.",
        cta: "Continue to listing",
      };
    case "give":
      return {
        title: "Give to community",
        info: "To give this project to the community, every product needs an AI video.",
        cta: "Continue",
      };
    case "relist":
      return { title: "Relist on the marketplace", info: "To relist, every product needs an AI video.", cta: "Relist" };
    case "edition":
      return {
        title: `Add ${productName} NFTs to the marketplace`,
        info: `${productName} needs an AI video first.`,
        cta: "Continue",
      };
  }
}

/** "1 of 2 ready" — the readiness dialog's Products meta. */
export function readyCountLine(ready: number, total: number): string {
  return `${ready} of ${total} ready`;
}

/** "1 of 2 products have a video" — the Media tab's Videos meta (owner only). */
export function videosGroupMeta(ready: number, total: number): string {
  return `${ready} of ${total} ${total === 1 ? "product has" : "products have"} a video`;
}

/** What the dialog's screen-reader status says when a row changes state —
 *  state changes only, never progress ticks (P2-VIDEO-14). */
export function stateChangeLine(productName: string, status: ProductVideoStatus): string | null {
  switch (status.state) {
    case "ready":
      return `${productName} video is ready.`;
    case "rendering":
      return `${productName} video is rendering.`;
    case "failed":
      return `${productName} video render failed.`;
    case "none":
      return null;
  }
}

/** The render toast's heading (P2-VIDEO-3). */
export function toastHeading(state: "rendering" | "ready" | "failed", eta: string): string {
  return state === "rendering" ? `Video rendering · ${eta} left` : state === "ready" ? "Video ready" : "Video render failed";
}
