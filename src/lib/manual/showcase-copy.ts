// Showcase's words (owner decision O5; COM-12, COM-55, COM-56), for both of
// its homes — the rail's Outcome row and the Brief's success step — so the
// two can't drift. Honest NOW: Showcase is a flag on the project in this
// browser, a badge and a tab. Innovations is a sample feed with no write
// path, so no line here says a post exists, is live, or is on Innovations.
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
  label: "Showcase";
  /** "Not showcased" | "Showcased since Sep 26, 2026" (the date in <time>). */
  value: MetaPart[];
  note: string;
  /** P2-VIDEO-15: the one product named in `note` ("Showcased — {Product} has no video yet."),
   *  which the row renders as a link to its page. */
  noteLink?: { text: string; href: string };
  action: "Showcase project" | "Stop showcasing";
};

/** What the Showcase gate (`view.videos.readiness.showcase`, P2-VIDEO-13) says about the videos. */
export type ShowcaseGate = { readiness: Readiness; projectId: string };

const NOT_SHOWCASED_NOTE = "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.";
const SHOWCASED_NOTE = "Nothing is posted — the Innovations feed isn't open yet.";

/**
 * COM-12's row and COM-55's control, from `summary.showcase` — showcasedAt, never the Brief's tick.
 * With the gate (P2-VIDEO-15) the note tells the videos' story:
 * - not showcased, the videos rule failing: "Showcasing needs an AI video for every product — {ready} of {total} have one.";
 * - showcased, but a current product has no ready video: "Showcased — {Product} has no video yet."
 *   ({Product} links to its page), or "Showcased — {n} products have no video yet.". The flag stays
 *   on; nothing is removed for the maker.
 * Otherwise the v1 notes stand.
 */
export function showcaseRow(showcase: { at: number } | null, gate?: ShowcaseGate): ShowcaseRowCopy {
  const r = gate?.readiness;
  if (!showcase) {
    const videosFail = r ? r.rules.some((x) => x.id === "videos" && !x.ok) : false;
    return {
      on: false,
      label: "Showcase",
      value: [{ kind: "text", text: "Not showcased" }],
      note:
        r && videosFail
          ? `Showcasing needs an AI video for every product — ${r.counts.ready} of ${r.counts.total} have one.`
          : NOT_SHOWCASED_NOTE,
      action: "Showcase project",
    };
  }
  const missing = r ? r.products.filter((x) => x.video.state !== "ready") : [];
  const on = {
    on: true,
    label: "Showcase" as const,
    value: [{ kind: "text" as const, text: "Showcased since " }, timePart(showcase.at, formatDate(showcase.at))],
    action: "Stop showcasing" as const,
  };
  if (gate && missing.length === 1) {
    const [one] = missing;
    const name = one.name.trim() || "Not named yet";
    return {
      ...on,
      note: `Showcased — ${name} has no video yet.`,
      noteLink: {
        text: name,
        href: `/projects/${encodeURIComponent(gate.projectId)}/products/${encodeURIComponent(one.productId)}`,
      },
    };
  }
  if (missing.length > 1) return { ...on, note: `Showcased — ${missing.length} products have no video yet.` };
  return { ...on, note: SHOWCASED_NOTE };
}

/** COM-56 — the Brief's success step, after any intent. */
export const SUCCESS_SHOWCASE = {
  action: "Showcase this project",
  line: "It goes under Showcase in My projects now. Nothing is posted until Innovations opens.",
  done: "Showcased — it's on your Showcase tab.",
  undo: "Undo",
} as const;

/** The polite announcement after either control flips it (COM-55, COM-56). */
export function showcaseAnnouncement(on: boolean, name: string): string {
  const n = name.trim() || "this project";
  return on ? `Showcased ${n}` : `Stopped showcasing ${n}`;
}
