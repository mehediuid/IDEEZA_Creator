// A product video's storyboard (owner, 2026-10-12, the Figma "Generate Video"
// → "Review your storyboard" flow): three scenes over the clip's 10 seconds —
// 0–3 s, 3–6 s and 6–10 s, the renderer's own three scenes (frames.ts) — each
// with a visual description, background audio, a music cue and speech.
//
// - `storyboardRequestOf` is what the model is asked, from the product and
//   the maker's two prompts (either may be left to AI: "Auto generate").
// - `parseStoryboard` reads the model's JSON answer, strictly; anything off
//   shape is null, and the caller drafts it here instead.
// - `draftStoryboard` is that draft: written from the product's own name and
//   description and the maker's words only — nothing invented.
// - `linesOfStoryboard`: the browser's renderer can't draw a description, so
//   each scene's speech is its on-screen text (≤ 60 characters), and a scene
//   without speech keeps the product's default line.
//
// Pure, relative imports only.

import type { OnScreenLines } from "./types";

export type Scene = {
  /** What the camera shows. */
  visual: string;
  /** Ambient sound under the scene. */
  background: string;
  /** The music, if any. */
  music: string;
  /** Spoken words; "" for none. */
  speech: string;
};

export type Storyboard = {
  scenes: [Scene, Scene, Scene];
  /** Who drafted it: the model, or this module when the model didn't answer. */
  by: "ai" | "draft";
};

export const SCENE_SPANS = ["0–3s", "3–6s", "6–10s"] as const;
export const SCENE_FIELD_MAX = 400;
const LINE_MAX = 60;

export type StoryboardInput = {
  productName: string;
  description: string;
  /** The maker's video prompt; "" when they left it to AI. */
  videoPrompt: string;
  /** The maker's audio prompt; "" when they left it to AI. */
  audioPrompt: string;
};

const clean = (s: unknown, max = SCENE_FIELD_MAX) =>
  typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** The model's instructions. */
export const STORYBOARD_SYSTEM =
  "You write the storyboard for a 10-second product video in exactly three scenes: 0-3s, 3-6s and 6-10s. " +
  "For each scene give: visual (camera, subject, setting, light — one or two sentences), background (ambient sound), " +
  "music (a short music cue, or \"\" for none) and speech (at most 8 spoken words, or \"\" for none). " +
  "Use only the product facts given; never invent a feature, a number or a claim. " +
  'Answer with ONLY this JSON, no prose and no markdown: {"scenes":[{"visual":"","background":"","music":"","speech":""},{...},{...}]}';

/** The user message for the model. */
export function storyboardRequestOf(input: StoryboardInput): string {
  return [
    `Product: ${clean(input.productName, 120) || "Untitled product"}`,
    `What it is: ${clean(input.description, 600) || "(no description)"}`,
    `Video idea: ${clean(input.videoPrompt, 800) || "(left to you: show the product clearly and attractively)"}`,
    `Sound idea: ${clean(input.audioPrompt, 400) || "(left to you: fitting ambience and a light music cue)"}`,
  ].join("\n");
}

/** The model's answer as three scenes, or null when it isn't exactly that. */
export function parseStoryboard(text: string): [Scene, Scene, Scene] | null {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
  const scenes = typeof raw === "object" && raw !== null ? (raw as { scenes?: unknown }).scenes : undefined;
  if (!Array.isArray(scenes) || scenes.length < 3) return null;
  const out = scenes.slice(0, 3).map((s) => {
    const o = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    return { visual: clean(o.visual), background: clean(o.background), music: clean(o.music), speech: clean(o.speech, 120) };
  });
  if (out.some((s) => !s.visual)) return null;
  return out as [Scene, Scene, Scene];
}

/** The storyboard drafted here, from the maker's words and the product's own. */
export function draftStoryboard(input: StoryboardInput): Storyboard {
  const name = clean(input.productName, 120) || "the product";
  const idea = clean(input.videoPrompt);
  const sound = clean(input.audioPrompt);
  const what = clean(input.description, 200);
  return {
    by: "draft",
    scenes: [
      {
        visual: idea ? `Opening on ${name}: ${idea}` : `Slow push-in on ${name}, centred on a clean surface, soft studio light.`,
        background: sound || "Quiet room tone.",
        music: sound ? "" : "Light ambient pad, slowly building.",
        speech: name,
      },
      {
        visual: `Close detail pass across ${name}, the camera panning left to right.`,
        background: sound || "Soft mechanical detail sounds.",
        music: sound ? "" : "The pad continues, a gentle beat joins.",
        speech: what ? cutWords(what, 8) : "",
      },
      {
        visual: `Pull back to show all of ${name}, the title fading in.`,
        background: sound || "Room tone settles.",
        music: sound ? "" : "Music resolves on a soft final chord.",
        speech: "Built with IDEEZA",
      },
    ],
  };
}

/** The first `n` words, as spoken. */
function cutWords(s: string, n: number): string {
  const words = s.replace(/[.!?]+$/, "").split(/\s+/);
  return words.length <= n ? words.join(" ") : `${words.slice(0, n).join(" ")}…`;
}

/** Each scene's speech as its on-screen text (≤ 60 characters); a silent scene keeps `fallback`'s line. */
export function linesOfStoryboard(sb: Storyboard, fallback: OnScreenLines): OnScreenLines {
  return sb.scenes.map((s, i) => {
    const t = s.speech.trim();
    if (!t) return fallback[i];
    return t.length <= LINE_MAX ? t : `${t.slice(0, LINE_MAX - 1).trimEnd()}…`;
  }) as OnScreenLines;
}

/** A stored storyboard, shape-checked; null when it isn't one. */
export function sanitizeStoryboard(raw: unknown): Storyboard | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as { scenes?: unknown; by?: unknown };
  if (!Array.isArray(r.scenes) || r.scenes.length !== 3) return null;
  const scenes = r.scenes.map((s) => {
    const o = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    return { visual: clean(o.visual), background: clean(o.background), music: clean(o.music), speech: clean(o.speech, 120) };
  }) as [Scene, Scene, Scene];
  return { scenes, by: r.by === "ai" ? "ai" : "draft" };
}
