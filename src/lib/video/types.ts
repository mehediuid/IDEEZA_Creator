// Product videos' shared types (Phase 2 spec §3.3.3 = VIDEO §3). Each
// product has its own record of takes, keyed by `ManualProduct.id`, in
// `ideeza:video:<projectId>`. The clip itself is a real file the browser
// renders from the product's image and its text (owner decision 9); its
// blobs live in IndexedDB `ideeza-video`.
//
// Types and constants only, with relative imports.

import type { ProductSource } from "../manual/projects";
import type { VideoJobStage } from "./jobs";

export const VIDEO_QUALITY = {
  low: { label: "Low", resolution: "360p", width: 640, height: 360, seconds: 10, tag: "Free", available: true },
  high: { label: "High", resolution: "720p", width: 1280, height: 720, seconds: 10, tag: "Upgrade", available: false },
} as const;
/** The same values as the Brief's `Quality`. */
export type VideoQuality = keyof typeof VIDEO_QUALITY;
/** At most 60 characters each. */
export type OnScreenLines = [string, string, string];
export type VideoFailureKind = "unsupported" | "storage" | "encode" | "interrupted" | "cancelled" | "lost";
export const TAKES_MAX = 5;

/** localStorage key of a project's `ProjectVideos`. */
export const VIDEOS_KEY = (projectId: string) => `ideeza:video:${projectId}`;

export type VideoTake = {
  /** "take_" + 8 base-36 = VideoJob.id = the clip-store key. */
  id: string;
  /** ManualProduct.id: which product it belongs to. */
  productId: string;
  /** "Take n", 1-based per product, never reused. */
  n: number;
  /** Kept for the model; the local renderer doesn't draw it. */
  prompt: string;
  lines: OnScreenLines;
  quality: VideoQuality;
  /** The build product whose image the frames used; null = no image. */
  source: ProductSource | null;
  createdAt: number;
  readyAt?: number;
  clip?: { mime: string; width: number; height: number; durationMs: number; bytes: number };
  failure?: { kind: VideoFailureKind; at: number };
};

export type ProductVideo = {
  /** Oldest first, at most TAKES_MAX. */
  takes: VideoTake[];
  /** Only ever a ready take. */
  inUseId: string | null;
  draft?: { prompt: string; lines: OnScreenLines; quality: VideoQuality };
};

export type ProjectVideos = { version: 1; projectId: string; products: Record<string, ProductVideo> };

export type ProductVideoStatus =
  | { state: "none" }
  | { state: "rendering"; take: VideoTake; stage: VideoJobStage; progress: number; eta: string }
  | { state: "ready"; take: VideoTake; next?: { take: VideoTake; progress: number; eta: string } }
  | { state: "failed"; take: VideoTake; failure: VideoFailureKind };
