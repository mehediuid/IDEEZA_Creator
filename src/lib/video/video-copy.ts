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
import type { ProjectVideoStatus } from "./project-video";

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

/** Under the storyboard (owner, 2026-10-12): what the browser can make of it today. */
export function storyboardHonesty(productName: string): string {
  return `This preview is made in your browser from ${productName}'s image, with each scene's speech shown on screen. The AI video and audio models aren't connected yet — your prompts and this storyboard are kept with the video for them.`;
}
export const CANNOT_PLAY_COPY = "This browser can't play this video file.";
export const PROMPT_BLOCKER = "Write what the video should show.";
export const HIGH_LOCKED_NOTE = "720p comes with the Disruptor plan.";
export const PROMPT_PLACEHOLDER = "Describe the shot — the product, the setting, how the camera moves";
export const RENDER_KEEPS_RUNNING = "You can close this — the render keeps running, and its progress shows in the corner.";
export const NO_VIDEO_PRODUCT =
  "No video yet — every product needs one before the project can be shared, sold or given.";
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
  tone: "error" | "neutral" | "success" | "brand";
  icon: "cross" | "spinner" | "check" | "alert" | "eye";
  /** The owner's action in this state (none while rendering or ready and settled). */
  action: "generate" | "retry" | "review" | null;
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
        : status.review
          ? { text: `Video ready · Take ${status.review.n} to review`, sub: null, tone: "success", icon: "check", action: "review", progress: null }
          : { text: "Video ready", sub: null, tone: "success", icon: "check", action: null, progress: null };
    case "review":
      // Finished, not chosen yet (owner, 2026-10-21): it doesn't count until Use this video.
      return { text: "Ready to review", sub: null, tone: "brand", icon: "eye", action: "review", progress: null };
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
  return action === "generate" ? "Generate AI video" : action === "retry" ? "Try again" : action === "review" ? "Review" : null;
}

export type ReadinessCopy = { title: string; info: string; cta: string };

/** P2-VIDEO-14's table, with §4.3's two added purposes. */
export function readinessCopy(purpose: ReadinessPurpose, productName = "This product"): ReadinessCopy {
  switch (purpose) {
    case "showcase":
      return {
        title: "Share to Innovations",
        info: "Every product needs an AI video, and the post needs your story.",
        cta: "Share to Innovations",
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
    case "videos":
      return {
        title: "Videos",
        info: "Every product needs an AI video. Then the project video is made from them.",
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
      return `${productName} video is in use.`;
    case "review":
      return `${productName} video is ready to review.`;
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
  return state === "rendering" ? `Video rendering · ${eta} left` : state === "ready" ? "Video ready · review it" : "Video render failed";
}

/** The line under a capped toast stack: how many more wait behind the ones shown. */
export function moreToastsLine(n: number): string {
  return `+${n} more video${n === 1 ? "" : "s"}`;
}

// ─────────────────────────── the project video (owner, 2026-10-21) ───────────────────────────

export const PROJECT_VIDEO_TITLE = "Project video";
export const PROJECT_GROUP_META = "Made from your product videos";
export const PROJECT_HONESTY =
  "Made in this browser from your product videos, silent for now. The intro, order, lines and sound are kept with the video for the AI video model.";

/** "0:19" — a project video's length on its row. */
export function clockOf(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type ProjectRowCopy = {
  text: string;
  /** A second line: the note under a ready video, or the failure. */
  sub: string | null;
  tone: "error" | "neutral" | "success" | "warning" | "brand";
  icon: "lock" | "check" | "spinner" | "alert" | "info" | "eye";
  action: "make" | "update" | "updateNote" | "retry" | "review" | null;
  /** 0–100 while it renders, else null. */
  progress: number | null;
};

/** The project row's one table (spec "Rows and copy"). Never a greyed button: while it waits, the
 *  row says why. */
export function projectRowCopy(s: ProjectVideoStatus): ProjectRowCopy {
  const v = s.video;
  switch (s.state) {
    case "waiting":
      return {
        text: s.total === 1 ? "Opens when your product video is ready" : `Opens when every product has a video · ${s.ready} of ${s.total} ready`,
        sub: null,
        tone: "neutral",
        icon: "lock",
        action: null,
        progress: null,
      };
    case "make":
      return { text: "Every product video is ready.", sub: null, tone: "neutral", icon: "check", action: "make", progress: null };
    case "rendering": {
      const progress = v.state === "rendering" ? v.progress : v.state === "ready" && v.next ? v.next.progress : 0;
      const eta = v.state === "rendering" ? v.eta : v.state === "ready" && v.next ? v.next.eta : "";
      return {
        text: `Rendering · ${Math.round(progress)} %`,
        sub: eta ? `${eta} left` : null,
        tone: "neutral",
        icon: "spinner",
        action: null,
        progress,
      };
    }
    case "ready": {
      const text = s.lengthMs ? `Project video ready · ${clockOf(s.lengthMs)}` : "Project video ready";
      if (v.state === "ready" && v.next) {
        return { text: `${text} · Take ${v.next.take.n} rendering ${Math.round(v.next.progress)} %`, sub: null, tone: "success", icon: "check", action: null, progress: null };
      }
      if (s.review) {
        return { text: `${text} · Take ${s.review.n} to review`, sub: null, tone: "success", icon: "check", action: "review", progress: null };
      }
      if (s.older.length > 0) {
        const sub = s.older.length === 1 ? `Made from an older ${s.older[0]} video.` : `Made from older videos of ${listNames(s.older)}.`;
        return { text, sub, tone: "success", icon: "check", action: "updateNote", progress: null };
      }
      return { text, sub: null, tone: "success", icon: "check", action: null, progress: null };
    }
    case "review":
      // Finished, not chosen yet (owner, 2026-10-21): it doesn't count until Use this video.
      return { text: "Ready to review", sub: null, tone: "brand", icon: "eye", action: "review", progress: null };
    case "outdated": {
      const canUpdate = s.total > 0 && s.ready === s.total;
      const what =
        s.missing.length > 0
          ? `${listNames(s.missing)} ${s.missing.length === 1 ? "isn't" : "aren't"} in it yet.`
          : `It still shows ${listNames(s.extra)}.`;
      return {
        text: canUpdate ? what : `${what} Make ${s.missing.length === 1 ? "its" : "their"} video first.`,
        sub: null,
        tone: "warning",
        icon: "alert",
        action: canUpdate ? "update" : null,
        progress: null,
      };
    }
    case "failed":
      return {
        text: "Render failed",
        sub: v.state === "failed" ? FAILURE_COPY[v.failure] : null,
        tone: "error",
        icon: "alert",
        action: "retry",
        progress: null,
      };
  }
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The project row's button. */
export function projectActionLabel(action: ProjectRowCopy["action"]): string | null {
  switch (action) {
    case "make":
      return "Make project video";
    case "update":
      return "Update project video";
    case "updateNote":
      return "Update";
    case "retry":
      return "Try again";
    case "review":
      return "Review";
    default:
      return null;
  }
}

/** What a screen reader hears when the project row changes state — never progress ticks. */
export function projectStateLine(s: ProjectVideoStatus, productCount: number): string | null {
  switch (s.state) {
    case "make":
      return productCount === 1
        ? "Your product video is ready. You can make the project video now."
        : `All ${productCount} product videos are ready. You can make the project video now.`;
    case "rendering":
      return "Project video is rendering.";
    case "ready":
      return "Project video is in use.";
    case "review":
      return "The project video is ready to review.";
    case "outdated":
      return s.total > 0 && s.ready === s.total ? "Every product has its video. You can update the project video now." : null;
    case "failed":
      return "Project video render failed.";
    case "waiting":
      return null;
  }
}
