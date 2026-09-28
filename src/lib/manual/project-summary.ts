// The shared summary (spec §5.1.3). One derivation of what a project is, so
// the My projects card and the project page's header print the same words
// (LST-32) and offer the same next step (COR-11, §3.5).
//
// Pure: no React, no storage and no clock of its own. The callers pass the
// builds, the project's brief draft (`readBriefDraft` on the list,
// `useProjectBrief` on the page), the video jobs and `now`.
//
// Value imports are relative, like src/lib/spec/*: tsc leaves `@/` as it is
// in its output, and `node --test` loads the compiled module without a
// bundler.

import type { BuildJob, BuildStatus } from "../create/history";
import { LICENSES, type BriefStepId, type Intent } from "../brief/types";
import type { StoredDraft } from "../brief/project-brief";
import { STEP_LABELS, stepHref, type ManualProject } from "./projects";
import {
  buildsOf,
  coverOf,
  pendingVersionsOf,
  productsOfProject,
  resumeStepOf,
  type BuildRef,
} from "./project-read";

// ─────────────────────────── the status ───────────────────────────

/** The glyph a status chip or the Showcase badge carries. The chip component
 *  maps each name to its Hugeicons glyph. The names live here so this module
 *  imports neither React nor the icon package. */
export type IconName = "circle" | "lock" | "hand-heart" | "tag" | "hexagon" | "eye";

/** The status is the outcome (owner decisions O5, O6). Showcase is not one of them. */
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted";
// LATER: | "lazyMinted" | "auction" | "paused" | "sold" — a live Buy-now listing stays "listed", with live facts

/** One table. Changing a word here changes the list tab, the card chip and the details chip together. */
export const STATUS_WORD: Record<ProjectStatus, string> = {
  draft: "Draft",
  private: "Private",
  given: "Given",
  listed: "Listed",
  minted: "Minted",
};

export const STATUS_ICON: Record<ProjectStatus, IconName> = {
  draft: "circle",
  private: "lock",
  given: "hand-heart",
  listed: "tag",
  minted: "hexagon",
};

/** "Listed" never stands alone before a marketplace exists (§4.1). */
export const LISTED_SUBLINE = "Goes on sale when the marketplace opens";
/** The same words mid-sentence, for the status line. */
const LISTED_IN_LINE = LISTED_SUBLINE.charAt(0).toLowerCase() + LISTED_SUBLINE.slice(1);

export type ShowcaseBadge = { word: string; icon: IconName; ariaLabel: string };
/** The Showcase badge: its own word and icon, info tone, beside the chip
 *  (LST-65, COR-9). It is not a control; its accessible name is "Showcased". */
export const SHOWCASE_BADGE: ShowcaseBadge = { word: "Showcase", icon: "eye", ariaLabel: "Showcased" };

export function projectStatus(p: ManualProject, draft: StoredDraft | null): ProjectStatus {
  const b = draft?.state;
  if (b?.mintedAt != null) {
    if (b.intent === "sell") return "listed";
    if (b.intent === "give") return "given";
    return "private";
  }
  return p.status === "completed" ? "minted" : "draft"; // "minted" = the record is unreadable (LST-9)
}

/** Showcase, from the project record only (COR-105). Null on a Draft, whatever the record holds. */
export function showcaseOf(p: ManualProject, status: ProjectStatus): { at: number } | null {
  return status !== "draft" && typeof p.showcasedAt === "number" ? { at: p.showcasedAt } : null;
}

// ─────────────────────────── the source ───────────────────────────

export type ProjectSource =
  | { kind: "build"; builds: number } // buildsOf(p).length, at least one job still in this browser
  | { kind: "build-gone" } // refs exist, none in this browser
  | { kind: "hand" };

export function projectSourceOf(refs: BuildRef[]): ProjectSource {
  if (!refs.length) return { kind: "hand" };
  return refs.some((r) => r.job) ? { kind: "build", builds: refs.length } : { kind: "build-gone" };
}

export const BUILD_GONE_TIP =
  "The build this project came from isn't stored in this browser any more. Its products are still listed.";

/** LST-38 / COR-55: the card's meta tag and the rail's Source row, the same words. */
export function sourceTag(source: ProjectSource): { label: string; tip: string | null } {
  switch (source.kind) {
    case "build":
      return { label: "AI build", tip: null };
    case "build-gone":
      return { label: "AI build · not in this browser", tip: BUILD_GONE_TIP };
    case "hand":
      return { label: "By hand", tip: null };
  }
}

// ─────────────────────────── the next step ───────────────────────────

export type NextAction =
  | { kind: "review-version"; label: string; href: string } // "Review version 3" → /build/<id>
  | { kind: "continue-brief"; label: "Continue Brief"; href: string }
  | { kind: "add-brief"; label: "Add Brief"; href: string }
  | { kind: "open-editor"; label: string; href: string } // "Open in editor" | "Open in editor · PCB Design"
  | { kind: "view-brief"; label: "View brief"; href: string };

/** The header pair; the My projects card shows `first` (LST-40). */
export type ActionPair = { first: NextAction; second: NextAction | null; violet: boolean };

/** A newer build of the project's chat, not saved anywhere yet (COR-18). */
export type PendingVersion = { buildId: string; n: number; status: BuildStatus };

/**
 * The one next-step chooser (§3.5). The header shows the pair and the card
 * shows `first`, so the two can't differ (COR-11). Showcase never changes it
 * (§3.8). At most one violet, and none once minted.
 */
export function nextAction(
  p: ManualProject,
  facts: {
    status: ProjectStatus;
    brief: StoredDraft | null;
    source: ProjectSource;
    pending: PendingVersion | null;
  },
): ActionPair {
  // The Brief is not an editor step. The workspace also wraps /brief, so a
  // stamp of it resumes PCB (resumeStepOf never returns "brief") with the
  // plain label: Open in editor never lands in the Brief, which has its own
  // button. The label names a step only when an editor step was stamped.
  const step = resumeStepOf(p);
  const stamped = !!p.lastOpened && p.lastOpened.step !== "brief";
  const editor: NextAction = {
    kind: "open-editor",
    label: stamped ? `Open in editor · ${STEP_LABELS[step]}` : "Open in editor",
    href: stepHref(p, step),
  };
  const briefHref = stepHref(p, "brief");

  if (facts.status === "minted") return { first: editor, second: null, violet: false };
  if (facts.status !== "draft") {
    return { first: editor, second: { kind: "view-brief", label: "View brief", href: briefHref }, violet: false };
  }
  if (facts.pending?.status === "ready") {
    return {
      first: {
        kind: "review-version",
        label: `Review version ${facts.pending.n}`,
        href: `/build/${facts.pending.buildId}`,
      },
      second: editor,
      violet: true,
    };
  }
  if (facts.brief) {
    return { first: { kind: "continue-brief", label: "Continue Brief", href: briefHref }, second: editor, violet: true };
  }
  const add: NextAction = { kind: "add-brief", label: "Add Brief", href: briefHref };
  return facts.source.kind === "hand"
    ? { first: editor, second: add, violet: true }
    : { first: add, second: editor, violet: true };
}

// ─────────────────────────── the one date formatter ───────────────────────────
// Fixed English, local time. The card, the header and every <time> read it,
// so the two surfaces can't disagree on a date.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function clock(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Sep 22, 2026" — the header's meta line (COR-10). */
export function formatDate(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Sep 22, 2026 · 9:09 PM" — the full form (COM-7, COR-52, COR-107), and every <time>'s title. */
export function formatDateTime(at: number): string {
  return `${formatDate(at)} · ${clock(new Date(at))}`;
}

/** LST-41's short form: the time today, "Sep 22" this year, "Sep 22, 2025" earlier. */
export function formatShortDate(at: number, now: number): string {
  const d = new Date(at);
  const n = new Date(now);
  const sameYear = d.getFullYear() === n.getFullYear();
  if (sameYear && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return clock(d);
  return sameYear ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : formatDate(at);
}

// ─────────────────────────── the status line (§4.1) ───────────────────────────

const INTENT_PHRASE: Record<Intent, string> = { sell: "to sell", give: "to give", save: "to keep" };
/** The Brief step the line names. None at the form step (§4.1 row 2), nor at success. */
const STEP_PHRASE: Record<BriefStepId, string | null> = {
  idea: "Idea step",
  preview: "Preview step",
  form: null,
  success: null,
};

/** The part of a VideoJob (components/video-jobs/video-jobs-provider.tsx) this module reads.
 *  Structural, so a lib module never imports a component file; a VideoJob[] passes as it is. */
export type ClipJob = { id: string; stage: string };

function clipStillRendering(brief: StoredDraft | null, jobs: ClipJob[]): boolean {
  const id = brief?.state.videoJobId;
  const job = id ? jobs.find((j) => j.id === id) : undefined;
  return !!job && job.stage !== "done" && job.stage !== "failed";
}

function statusLineOf(
  status: ProjectStatus,
  f: { brief: StoredDraft | null; showcased: boolean; pending: PendingVersion | null; clip: boolean; now: number },
): string {
  if (status === "draft") {
    if (f.pending?.status === "ready") return `Version ${f.pending.n} is ready to save`;
    const brief = f.brief;
    if (!brief) return "Not briefed yet";
    const intent = brief.state.intent;
    if (!intent) return "Brief started";
    const step = STEP_PHRASE[brief.step];
    return ["Brief in progress", INTENT_PHRASE[intent], ...(step ? [step] : [])].join(" · ");
  }
  if (status === "minted") return "Minted · the brief record isn't in this browser";

  const mintedAt = f.brief?.state.mintedAt ?? null;
  const minted = mintedAt !== null ? `Minted ${formatShortDate(mintedAt, f.now)}` : "Minted";
  const clip = f.clip ? " · preview clip still rendering" : "";
  // "Listed" never stands without its subline (COR-76), so a rendering clip is added to it, not swapped in.
  if (status === "listed") return `${minted} · ${LISTED_IN_LINE}${clip}`;
  if (f.clip) return `${minted}${clip}`;
  if (status === "given") {
    const license = f.brief?.state.license ?? null;
    const licence = license ? LICENSES.find((l) => l.value === license) : undefined;
    return licence ? `${minted} · given to the community under ${licence.label}` : `${minted} · given to the community`;
  }
  return f.showcased ? `${minted} · kept by you` : `${minted} · kept private`;
}

// ─────────────────────────── the summary ───────────────────────────

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectStatus;
  statusWord: string; // STATUS_WORD[status]
  statusLine: string; // §4.1
  showcase: { at: number } | null; // showcaseOf() — the badge and the Showcase tab
  products: { id: string; name: string; description: string }[]; // the current version + products a later version dropped (COR-42)
  productCount: number; // products.length — never a count of builds
  source: ProjectSource;
  next: ActionPair;
  when: { label: "Saved" | "Created"; at: number }; // latest savedAt, else createdAt (COR-10, §7)
  version: { kind: "single"; v: number } | { kind: "builds"; k: number } | null; // "Version 2" | "3 builds" | none
  pendingVersion: PendingVersion | null;
  cover: string | null; // coverOf()
  mintedAt: number | null;
  sortKey: number; // "Recently updated": updatedAt NOW, lastActivityAt NEXT (LST-24)
};

function pendingOf(refs: BuildRef[], all: BuildJob[], projects?: ManualProject[]): PendingVersion | null {
  const waiting = pendingVersionsOf(refs, all, projects);
  const pick = waiting.find((w) => w.status === "ready") ?? waiting[0];
  return pick ? { buildId: pick.job.id, n: pick.version, status: pick.status } : null;
}

/** "Saved" when any build has a save time; otherwise "Created" (a hand-made project, or one a build joined
 *  before save times were recorded — it was created then, and its save time is unknown). */
function whenOf(p: ManualProject, refs: BuildRef[]): ProjectSummary["when"] {
  const saved = refs.map((r) => r.savedAt).filter((t): t is number => typeof t === "number");
  return saved.length ? { label: "Saved", at: Math.max(...saved) } : { label: "Created", at: p.createdAt };
}

/** LST-42 / COR-10: one lineage past version 1 → its version; several lineages → the build count. */
function versionOf(refs: BuildRef[]): ProjectSummary["version"] {
  const lineages = new Set(refs.map((r) => r.chatId));
  if (lineages.size > 1) return { kind: "builds", k: refs.length };
  const top = Math.max(0, ...refs.map((r) => r.version));
  return top > 1 ? { kind: "single", v: top } : null;
}

export function projectSummary(
  p: ManualProject,
  ctx: {
    builds: BuildJob[];
    brief: StoredDraft | null;
    videoJobs: ClipJob[];
    now: number;
    /** The live projects, so a build saved into a deleted one reads as pending (pendingVersionsOf). */
    projects?: ManualProject[];
  },
): ProjectSummary {
  const refs = buildsOf(p, ctx.builds);
  const status = projectStatus(p, ctx.brief);
  const showcase = showcaseOf(p, status);
  const source = projectSourceOf(refs);
  const pendingVersion = pendingOf(refs, ctx.builds, ctx.projects);
  const products = productsOfProject(p, refs).map(({ id, name, description }) => ({ id, name, description }));
  return {
    id: p.id,
    name: p.name,
    status,
    statusWord: STATUS_WORD[status],
    statusLine: statusLineOf(status, {
      brief: ctx.brief,
      showcased: showcase !== null,
      pending: pendingVersion,
      clip: clipStillRendering(ctx.brief, ctx.videoJobs),
      now: ctx.now,
    }),
    showcase,
    products,
    productCount: products.length,
    source,
    next: nextAction(p, { status, brief: ctx.brief, source, pending: pendingVersion }),
    when: whenOf(p, refs),
    version: versionOf(refs),
    pendingVersion,
    cover: coverOf(p, refs),
    mintedAt: ctx.brief?.state.mintedAt ?? null,
    sortKey: p.updatedAt,
  };
}

// ─────────────────────────── what each surface prints ───────────────────────────
// The card renders cardText(), the header renders headerText(). Neither builds
// these strings itself: the LST-32 test compares them.

export function countLabel(n: number): string {
  return `${n} ${n === 1 ? "product" : "products"}`;
}

/** LST-37: "4 products · RC Car Controller, Remote Controller +2". An unnamed
 *  product reads "not named yet", never "Untitled product". */
export function productLine(s: Pick<ProjectSummary, "products">): string {
  const n = s.products.length;
  const names = s.products.slice(0, 2).map((x) => x.name.trim() || "not named yet");
  if (!names.length) return countLabel(n);
  const more = n - names.length;
  return `${countLabel(n)} · ${names.join(", ")}${more > 0 ? ` +${more}` : ""}`;
}

/** "Version 2" · "3 builds" · null. */
export function versionLabel(v: ProjectSummary["version"]): string | null {
  if (!v) return null;
  return v.kind === "single" ? `Version ${v.v}` : `${v.k} builds`;
}

export type TimeText = { text: string; dateTime: string; title: string };
/** One segment of a meta line; the surface joins them with " · " and renders a time part in <time>. */
export type MetaPart = { kind: "text"; text: string } | { kind: "time"; time: TimeText };
export type ChipText = { word: string; icon: IconName; badge: ShowcaseBadge | null; line: string };

export type CardText = {
  chip: ChipText;
  count: string;
  productLine: string; // LST-37
  meta: MetaPart[]; // LST-38 · LST-41 · LST-42: "AI build · Saved 4:12 PM · Version 2"
  metaText: string;
  sourceTip: string | null; // the tooltip on "AI build · not in this browser"
  version: string | null;
  action: NextAction & { ariaLabel: string }; // LST-40: next.first, "{label} for {project}"
};

export type HeaderText = {
  chip: ChipText;
  count: string;
  meta: MetaPart[]; // COR-10: "4 products · Version 2 · Saved Sep 26, 2026"
  metaText: string;
  version: string | null;
  pair: ActionPair; // COR-11
};

function chipOf(s: ProjectSummary): ChipText {
  return { word: s.statusWord, icon: STATUS_ICON[s.status], badge: s.showcase ? SHOWCASE_BADGE : null, line: s.statusLine };
}

function timeOf(s: ProjectSummary, date: string): TimeText {
  return { text: `${s.when.label} ${date}`, dateTime: new Date(s.when.at).toISOString(), title: formatDateTime(s.when.at) };
}

function metaTextOf(parts: MetaPart[]): string {
  return parts.map((m) => (m.kind === "time" ? m.time.text : m.text)).join(" · ");
}

export function cardText(s: ProjectSummary, now: number): CardText {
  const tag = sourceTag(s.source);
  const version = versionLabel(s.version);
  const meta: MetaPart[] = [
    { kind: "text", text: tag.label },
    { kind: "time", time: timeOf(s, formatShortDate(s.when.at, now)) },
  ];
  if (version) meta.push({ kind: "text", text: version });
  return {
    chip: chipOf(s),
    count: countLabel(s.productCount),
    productLine: productLine(s),
    meta,
    metaText: metaTextOf(meta),
    sourceTip: tag.tip,
    version,
    action: { ...s.next.first, ariaLabel: `${s.next.first.label} for ${s.name}` },
  };
}

export function headerText(s: ProjectSummary): HeaderText {
  const version = versionLabel(s.version);
  const meta: MetaPart[] = [{ kind: "text", text: countLabel(s.productCount) }];
  if (s.source.kind === "hand") meta.push({ kind: "text", text: "Made by hand" });
  else if (version) meta.push({ kind: "text", text: version });
  meta.push({ kind: "time", time: timeOf(s, formatDate(s.when.at)) });
  if (s.source.kind === "build-gone") meta.push({ kind: "text", text: "build not in this browser" });
  return {
    chip: chipOf(s),
    count: countLabel(s.productCount),
    meta,
    metaText: metaTextOf(meta),
    version,
    pair: s.next,
  };
}

// ─────────────────────────── the list's search and view (B1) ───────────────────────────
// The three names spec §5.1.3 keeps beside the summary. The list state only
// /projects needs — the tabs, the order, the page and the URL codec — is
// src/lib/manual/project-list.ts.

/** Case- and accent-insensitive: NFKD splits "é" into "e" and a combining mark, which is dropped. */
function fold(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Search (LST-13/14): NFKD, drop diacritics, lowercase; every whitespace token must be found in
 * the name, a product name, the description or a product description. `via` names the product
 * the match lies in when the name, the description and the first product don't hold every word
 * and one other product does (LST-14, "the only match").
 */
export function matchProject(
  s: ProjectSummary,
  description: string,
  q: string,
): { hit: boolean; via?: string } {
  const tokens = fold(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return { hit: true };
  const [first, ...rest] = s.products;
  const head = fold([s.name, description, first?.name ?? "", first?.description ?? ""].join("\n"));
  const others = rest.map((x) => ({ name: x.name.trim(), text: fold(`${x.name}\n${x.description}`) }));
  const everything = [head, ...others.map((o) => o.text)].join("\n");
  if (!tokens.every((t) => everything.includes(t))) return { hit: false };
  if (tokens.every((t) => head.includes(t))) return { hit: true };
  const only = others.find((o) => o.name && tokens.every((t) => o.text.includes(t)));
  return only ? { hit: true, via: only.name } : { hit: true };
}

/** List view state in the URL (LST-28): written with `replace`, defaults left out. */
export type ListQuery = {
  tab: "all" | "draft" | "private" | "given" | "listed" | "showcase"; // showcase = membership (LST-10)
  q: string;
  sort: "updated" | "newest" | "oldest" | "name";
  source: "any" | "build" | "hand";
  page: number; // 1-based
};
export const PAGE_SIZE = 12;
// e.g. /projects?tab=draft&q=remote&sort=name&source=hand&page=2
