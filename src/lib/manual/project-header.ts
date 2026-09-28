// The project header's own words and rules (spec §5.4) — what `headerText()`
// in project-summary.ts doesn't print: the inline editors' checks (CNT-2,
// CNT-5) and the pending-version notices (COR-18). The chip, status line,
// meta line and action pair are `headerText()`'s; nothing here repeats them.
//
// Pure. Value imports are relative, so `node --test` loads the compiled
// module as it is (harness notes).

import { piecesOf, type Lineage, type PendingBuild } from "./project-read";

/** CNT-5 / COR-93: the store kept the change in memory, but localStorage refused it. */
export const WRITE_FAILED = "This browser's storage is full — the change wasn't saved.";

/** CNT-1: the polite line after a rename. */
export function renamedMessage(name: string): string {
  return `Renamed to “${name}”`;
}

/** COR-101: the polite line after the description is saved. */
export const DESCRIPTION_SAVED = "Description saved";

/** Characters as a person counts them: an emoji is one, not two UTF-16 units. */
const lengthOf = (s: string) => Array.from(s).length;
const thousands = (n: number) => n.toLocaleString("en-US");

export type NameCheck = {
  /** The trimmed name — what Save writes. */
  value: string;
  error: string | null;
  /** "84/80", only past the limit. */
  counter: string | null;
  /** Not an error: another project may share the name. */
  note: string | null;
};

/** CNT-2: trimmed, 1–max characters. A name another project uses is allowed, with a note. */
export function checkProjectName(raw: string, otherNames: readonly string[], max: number): NameCheck {
  const value = raw.trim();
  const n = lengthOf(value);
  if (n === 0) return { value, error: "Give the project a name.", counter: null, note: null };
  if (n > max) return { value, error: `Keep it to ${max} characters.`, counter: `${n}/${max}`, note: null };
  const key = value.toLowerCase();
  const taken = otherNames.some((x) => x.trim().toLowerCase() === key);
  return { value, error: null, counter: null, note: taken ? `Another project is already called “${value}”.` : null };
}

export type DescriptionCheck = {
  /** The trimmed description — what Save writes. */
  value: string;
  length: number;
  /** "812 / 1,000", from `counterFrom` characters on. */
  counter: string | null;
  tooLong: boolean;
  /** What a refused Save says. */
  error: string | null;
};

/** CNT-5: 0–max characters after trimming. The caller flags it only once the text was edited. */
export function checkDescription(raw: string, max: number, counterFrom: number): DescriptionCheck {
  const value = raw.trim();
  const length = lengthOf(value);
  const tooLong = length > max;
  return {
    value,
    length,
    counter: length >= counterFrom ? `${thousands(length)} / ${thousands(max)}` : null,
    tooLong,
    error: tooLong ? `Keep it under ${thousands(max)} characters (now ${thousands(length)}).` : null,
  };
}

export type PendingNotice = {
  buildId: string;
  tone: "info" | "attention";
  text: string;
  /** Changes only when the notice should be spoken again: a new state, or every
   *  tenth of the pieces while it builds (COR-101) — never every progress tick. */
  announceKey: string;
  action: { kind: "review" | "chat"; label: string; href: string } | null;
};

/**
 * COR-18: one notice per lineage whose newest build is newer than its latest
 * saved version and belongs to no project. `reviewedInHeader` is the build the
 * header's primary already opens — `summary.pendingVersion.buildId` when
 * `next.first` is "review-version" (A3's PendingVersion), else null. That
 * notice carries no button of its own; any other ready one (a minted project,
 * or a second lineage) carries a quiet Review version {n}.
 */
export function pendingNoticesOf(
  pending: readonly PendingBuild[],
  lineages: readonly Pick<Lineage, "chatId" | "title">[],
  reviewedInHeader: string | null,
): PendingNotice[] {
  return pending.map((p): PendingNotice => {
    const buildId = p.job.id;
    const v = p.version;
    if (p.status === "ready") {
      const lineage = lineages.find((l) => l.chatId === p.chatId)?.title ?? p.job.title;
      return {
        buildId,
        tone: "info",
        text: `Version ${v} of ${lineage} is ready to save.`,
        announceKey: "ready",
        action: buildId === reviewedInHeader ? null : { kind: "review", label: `Review version ${v}`, href: `/build/${buildId}` },
      };
    }
    if (p.status === "partial" || p.status === "failed") {
      return {
        buildId,
        tone: "attention",
        text: `Version ${v} needs a retry. Open the chat to retry it.`,
        announceKey: "retry",
        action: { kind: "chat", label: "Open chat", href: `/chat/${p.chatId}` },
      };
    }
    if (p.status === "queued") {
      return { buildId, tone: "info", text: `Version ${v} is waiting to build.`, announceKey: "queued", action: null };
    }
    // Running. A pending build's pieces are its own, never the project's.
    const { ready, total } = piecesOf(p.job);
    return {
      buildId,
      tone: "info",
      text: `Version ${v} is building — ${ready} of ${total} pieces.`,
      announceKey: `building:${total ? Math.floor((ready * 10) / total) : 0}`,
      action: null,
    };
  });
}
