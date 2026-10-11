// The project header's own words and rules (spec §5.4) — what `headerText()`
// in project-summary.ts doesn't print: the inline editors' checks (CNT-2,
// CNT-5), the pending-version notices (COR-18), and the engineering header's
// stage line, meta line and Earn button (Build and Earn P0). The chip, status
// line, meta line and action pair a buyer reads are `headerText()`'s; nothing
// here repeats them.
//
// Pure. Value imports are relative, so `node --test` loads the compiled
// module as it is (harness notes).

import { earnHref } from "./earn-route";
import type { ProjectLock, Readiness } from "./p2-types";
import { piecesOf, type Lineage, type PendingBuild } from "./project-read";
import { countLabel, formatDate, formatDateTime, type MetaPart, type ProjectStatus, type ProjectSummary } from "./project-summary";

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

// ─────────────────────────── the engineering header (Build and Earn P0) ───────────────────────────

/**
 * The stage line, in the status chip's old place: what the project is as engineering, from the
 * summary's own facts. "Built · 3 products · v2".
 * - The stage: "Building" while a newer version of a lineage builds or waits to; "Made by hand"
 *   for a project no build stands behind; "Built" otherwise.
 * - The products, counted as the card counts them.
 * - The version: "v{n}" for one lineage ("v1" before a second version), "{k} builds" across
 *   several lineages; none for a project made by hand.
 */
export function stageLineOf(s: Pick<ProjectSummary, "source" | "productCount" | "version" | "pendingVersion">): string {
  const waiting = s.pendingVersion?.status === "running" || s.pendingVersion?.status === "queued";
  const hand = s.source.kind === "hand";
  const stage = waiting ? "Building" : hand ? "Made by hand" : "Built";
  const version = s.version ? (s.version.kind === "single" ? `v${s.version.v}` : `${s.version.k} builds`) : hand ? null : "v1";
  return [stage, countLabel(s.productCount), ...(version ? [version] : [])].join(" · ");
}

/** The engineering meta line: the stage line already counts the products and names the
 *  version, so this keeps the rest of COR-10's line — "Saved Sep 26, 2026[ · build not in this
 *  browser][ · Stage Prototype]". No ownership lead: who holds what is Earn › Splits. */
export function engineeringMetaOf(s: Pick<ProjectSummary, "when" | "source">, stage: { short: string } | null): MetaPart[] {
  const at = s.when.at;
  const meta: MetaPart[] = [
    { kind: "time", time: { text: `${s.when.label} ${formatDate(at)}`, dateTime: new Date(at).toISOString(), title: formatDateTime(at) } },
  ];
  if (s.source.kind === "build-gone") meta.push({ kind: "text", text: "build not in this browser" });
  if (stage) meta.push({ kind: "text", text: `Stage ${stage.short}` });
  return meta;
}

export const EARN_LABEL = "Earn from this project";

export type EarnButtonState = "notReady" | "ready" | "active" | "soldInFull";

/** The engineering page's one door to Earn: its label stays, its tone and short fact follow the
 *  project. It always opens the Earn overview. */
export type EarnButton = {
  state: EarnButtonState;
  label: typeof EARN_LABEL;
  /** The fact said beside the button: "1 of 2 ready", "Listed", "Sold 40%", "Sold in full"; null when ready. */
  sub: string | null;
  violet: boolean;
  href: string;
};

/**
 * The Earn button's state, first match wins:
 * 1. sold in full (the lock) → quiet, "Sold in full": Earn opens read-only;
 * 2. a live or paused listing, a partial sale, or a project given away → quiet, the live fact:
 *    "Listed", "Listing paused", "Sold 40%", "Given to the community";
 * 3. `readinessOf(…, "sell")` passes → ready, the page's one violet — unless the header's
 *    Review version is pending, which keeps the violet, and Earn is quiet;
 * 4. otherwise not ready → quiet, "{passed} of {total} ready" over the same rules.
 */
export function earnButtonOf(input: {
  projectId: string;
  status: ProjectStatus;
  lock: ProjectLock | null;
  soldSharePct: number;
  /** `view.videos.readiness.sell`. */
  readiness: Pick<Readiness, "ok" | "rules">;
  /** The header shows Review version {n}, which is violet. */
  reviewPending: boolean;
}): EarnButton {
  const quiet = (state: EarnButtonState, sub: string | null): EarnButton => ({
    state,
    label: EARN_LABEL,
    sub,
    violet: false,
    href: earnHref(input.projectId),
  });
  if (input.lock) return quiet("soldInFull", "Sold in full");
  switch (input.status) {
    case "listed":
      return quiet("active", "Listed");
    case "paused":
      return quiet("active", "Listing paused");
    case "sold":
      return quiet("active", `Sold ${input.soldSharePct}%`);
    case "given":
      return quiet("active", "Given to the community");
    default:
      break;
  }
  if (input.readiness.ok) return { ...quiet("ready", null), violet: !input.reviewPending };
  const passed = input.readiness.rules.filter((r) => r.ok).length;
  return quiet("notReady", `${passed} of ${input.readiness.rules.length} ready`);
}
