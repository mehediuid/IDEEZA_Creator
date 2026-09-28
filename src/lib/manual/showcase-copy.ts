// Showcase's words (owner decision O5; COM-12, COM-55, COM-56), for both of
// its homes — the rail's Outcome row and the Brief's success step — so the
// two can't drift. Honest NOW: Showcase is a flag on the project in this
// browser, a badge and a tab. Innovations is a sample feed with no write
// path, so no line here says a post exists, is live, or is on Innovations.
//
// Value imports are relative: tsc leaves `@/` as it is in its output, and
// node:test loads the compiled module without a bundler.

import { formatDate, formatDateTime, type MetaPart } from "./project-summary";

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
  action: "Showcase project" | "Stop showcasing";
};

/** COM-12's row and COM-55's control, from `summary.showcase` — showcasedAt, never the Brief's tick. */
export function showcaseRow(showcase: { at: number } | null): ShowcaseRowCopy {
  if (!showcase) {
    return {
      on: false,
      label: "Showcase",
      value: [{ kind: "text", text: "Not showcased" }],
      note: "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.",
      action: "Showcase project",
    };
  }
  return {
    on: true,
    label: "Showcase",
    value: [{ kind: "text", text: "Showcased since " }, timePart(showcase.at, formatDate(showcase.at))],
    note: "Nothing is posted — the Innovations feed isn't open yet.",
    action: "Stop showcasing",
  };
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
