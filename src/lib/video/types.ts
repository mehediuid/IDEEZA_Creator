// Product videos' shared types (Phase 2 spec §3.3.3 = VIDEO §3). Each
// product has its own record of takes, keyed by `ManualProduct.id`, in
// `ideeza:video:<projectId>`. The clip itself is a real file the browser
// renders from the product's image and its text (owner decision 9); its
// blobs live in IndexedDB `ideeza-video`.
//
// Types and constants only, with relative imports.

import type { PlanTier } from "../create/plans";
import type { ProductSource } from "../manual/projects";
import type { VideoJobStage } from "./jobs";
import type { Storyboard } from "./storyboard";

export const VIDEO_QUALITY = {
  low: { label: "Low", resolution: "480p", width: 854, height: 480, seconds: 10, tag: "Free" },
  high: { label: "High", resolution: "720p", width: 1280, height: 720, seconds: 10, tag: "Upgrade" },
} as const;
/** The same values as the Brief's `Quality`. */
export type VideoQuality = keyof typeof VIDEO_QUALITY;

/** 720p comes with the Disruptor plan (the Pricing page's comparison); 480p with every plan. */
export function qualityOpen(q: VideoQuality, tier: PlanTier): boolean {
  return q === "low" || tier === "disruptor";
}
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
  /** The sound the maker asked for (owner, 2026-10-12); "" when left to AI. Kept for the model. */
  audioPrompt?: string;
  /** "Auto generate": the video and/or the audio left to AI. */
  auto?: { video: boolean; audio: boolean };
  /** The three scenes the maker reviewed before Generate; each scene's speech is its on-screen line. */
  storyboard?: Storyboard;
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
  draft?: VideoDraft;
};

/** What the maker typed into Generate video, kept between visits. */
export type VideoDraft = {
  prompt: string;
  lines: OnScreenLines;
  quality: VideoQuality;
  audioPrompt?: string;
  auto?: { video: boolean; audio: boolean };
};

export type ProjectVideos = { version: 1; projectId: string; products: Record<string, ProductVideo> };

export type ProductVideoStatus =
  | { state: "none" }
  | { state: "rendering"; take: VideoTake; stage: VideoJobStage; progress: number; eta: string }
  | { state: "ready"; take: VideoTake; next?: { take: VideoTake; progress: number; eta: string } }
  | { state: "failed"; take: VideoTake; failure: VideoFailureKind };
