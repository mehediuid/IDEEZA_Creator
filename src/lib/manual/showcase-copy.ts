// Sharing's words (owner decision O5; COM-12, COM-55, COM-56; owner,
// 2026-10-11: "Showcase" read as silly — it is "Share to Innovations" now),
// for every home — the project's ⋯ menu, the Earn Outcome row and the Brief's
// success step — so they can't drift. Honest NOW: sharing is a flag on the
// project in this browser; Innovations shows it under "Shared by you" at the
// top of the page (the sample feed below it has no write path).
//
// Value imports are relative: tsc leaves `@/` as it is in its output, and
// node:test loads the compiled module without a bundler.

import { formatDate, formatDateTime, type MetaPart } from "./project-summary";
import type { Readiness } from "./p2-types";

/** A date inside a line, ready for `<time dateTime title>` — A3's MetaPart convention. */
export function timePart(at: number, text: string): MetaPart {
  return { kind: "time", time: { text, dateTime: new Date(at).toISOString(), title: formatDateTime(at) } };
}

/** The line as it reads. */
export function plainText(parts: MetaPart[]): string {
  return parts.map((p) => (p.kind === "text" ? p.text : p.time.text)).join("");
}

export type ShowcaseRowCopy = {
  on: boolean;
  label: "Innovations";
  /** "Not shared" | "Shared since Sep 26, 2026" (the date in <time>). */
  value: MetaPart[];
  note: string;
  /** P2-VIDEO-15: the one product named in `note` ("Shared — {Product} has no video yet."),
   *  which the row renders as a link to its page. */
  noteLink?: { text: string; href: string };
  action: "Share to Innovations" | "Stop sharing";
};

/** What the Showcase gate (`view.videos.readiness.showcase`, P2-VIDEO-13) says about the videos. */
export type ShowcaseGate = { readiness: Readiness; projectId: string };

const NOT_SHOWCASED_NOTE = "Sharing shows it at the top of the Innovations page.";
const SHOWCASED_NOTE = "It shows at the top of the Innovations page.";
const NEEDS_PROJECT_VIDEO = "Sharing needs the project video, made from your product videos.";
const SHARED_NO_PROJECT_VIDEO = "Shared — the project video isn't ready yet.";

/**
 * COM-12's row and COM-55's control, from `summary.showcase` — showcasedAt, never the Brief's tick.
 * With the gate (P2-VIDEO-15) the note tells the videos' story:
 * - not shared, the videos rule failing: "Sharing needs an AI video for every product — {ready} of {total} have one.";
 * - shared, but a current product has no ready video: "Shared — {Product} has no video yet."
 *   ({Product} links to its page), or "Shared — {n} products have no video yet.". The flag stays
 *   on; nothing is removed for the maker.
 * - the product videos in place but the project video not (owner, 2026-10-21): "Sharing needs the
 *   project video, made from your product videos." / "Shared — the project video isn't ready yet."
 * Otherwise the v1 notes stand.
 */
export function showcaseRow(showcase: { at: number } | null, gate?: ShowcaseGate): ShowcaseRowCopy {
  const r = gate?.readiness;
  if (!showcase) {
    const videosFail = r ? r.rules.some((x) => x.id === "videos" && !x.ok) : false;
    const projectFail = r ? r.rules.some((x) => x.id === "projectVideo" && !x.ok) : false;
    return {
      on: false,
      label: "Innovations",
      value: [{ kind: "text", text: "Not shared" }],
      note:
        r && videosFail
          ? `Sharing needs an AI video for every product — ${r.counts.ready} of ${r.counts.total} have one.`
          : projectFail
            ? NEEDS_PROJECT_VIDEO
            : NOT_SHOWCASED_NOTE,
      action: "Share to Innovations",
    };
  }
  const missing = r ? r.products.filter((x) => x.video.state !== "ready") : [];
  const on = {
    on: true,
    label: "Innovations" as const,
    value: [{ kind: "text" as const, text: "Shared since " }, timePart(showcase.at, formatDate(showcase.at))],
    action: "Stop sharing" as const,
  };
  if (gate && missing.length === 1) {
    const [one] = missing;
    const name = one.name.trim() || "Not named yet";
    return {
      ...on,
      note: `Shared — ${name} has no video yet.`,
      noteLink: {
        text: name,
        href: `/projects/${encodeURIComponent(gate.projectId)}/products/${encodeURIComponent(one.productId)}`,
      },
    };
  }
  if (missing.length > 1) return { ...on, note: `Shared — ${missing.length} products have no video yet.` };
  if (r?.project && !r.project.ok) return { ...on, note: SHARED_NO_PROJECT_VIDEO };
  return { ...on, note: SHOWCASED_NOTE };
}

/** COM-56 — the Brief's success step, after any intent. */
export const SUCCESS_SHOWCASE = {
  action: "Share to Innovations",
  line: "It shows at the top of the Innovations page. You can stop sharing any time.",
  done: "Shared to Innovations.",
  undo: "Undo",
} as const;

/** The polite announcement after either control flips it (COM-55, COM-56). */
export function shareAnnouncement(on: boolean, name: string): string {
  const n = name.trim() || "this project";
  return on ? `Shared ${n} to Innovations` : `Stopped sharing ${n}`;
}
