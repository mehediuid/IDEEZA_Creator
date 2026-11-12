// The phone's project page (mobile Figma "Project Details · 2026 update"):
// what the coded prototype at /m adds to the web's project logic, and
// nothing the web already decides. The web's derivation (`projectView`),
// words and rules stay theirs; this keeps the phone's own IA — the four tabs
// (Overview · Products · Media · Activity), where a web address goes on the
// phone, the Bottom action bar's two states, the delete sheet's blocked
// variants and the Review version screen's change lines.
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import { PROJECTS } from "../feed";
import { samplePostOf } from "../innovations/sample-posts";
import type { InnovationPost } from "../innovations/types";
import type { DeleteBlock } from "./permissions";
import type { PublishIntent } from "./earn-route";
import type { EarnButton } from "./earn-view";
import type { Role } from "../network/types";

// ─────────────────────────── the tabs (M1) ───────────────────────────

export type PhoneTab = "overview" | "products" | "media" | "activity";

/** M1: Overview first and the default; the tabs pin under the top bar while scrolling (01b). */
export const PHONE_TABS: readonly { id: PhoneTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "media", label: "Media" },
  { id: "activity", label: "Activity" },
];

/** `?tab=` as the phone reads it: an unknown value is the Overview. The web's `contributors` and
 *  `team` tabs are a screen of their own on the phone (06), so they read as the Overview too. */
export function parsePhoneTab(raw: string | null | undefined): PhoneTab {
  return PHONE_TABS.some((t) => t.id === raw) ? (raw as PhoneTab) : "overview";
}

/**
 * The web's `?tab=` values that are a screen of their own on the phone (06 Team, 06b Network,
 * 05 Versions): the page replaces itself with that screen, so a web link or a notification that
 * names the tab lands in the right place. `contributors` is the web's older name for Team.
 */
export function phoneSubScreenOf(raw: string | null | undefined): "team" | "network" | "versions" | null {
  if (raw === "team" || raw === "contributors") return "team";
  if (raw === "network" || raw === "versions") return raw;
  return null;
}

// ─────────────────────────── addresses ───────────────────────────

const enc = encodeURIComponent;

/** The phone's project page, on a tab (the Overview leaves `?tab=` out). */
export function phoneProjectHref(projectId: string, tab: PhoneTab = "overview"): string {
  return `/m/projects/${enc(projectId)}${tab === "overview" ? "" : `?tab=${tab}`}`;
}

/** A screen under the project: `versions`, `team`, `network`, `video`, `activity/new`, … */
export function phoneProjectPath(projectId: string, rest: string): string {
  return `/m/projects/${enc(projectId)}/${rest}`;
}

/**
 * A web address the shared logic hands back (earnHref, publishHrefOf, productAtVersionHref, a
 * pending notice's action), as the phone opens it:
 * - `/projects/<id>…` (Earn, a product, the mint) → `/m/projects/<id>…`, query and hash kept;
 * - `/build/<buildId>` (Review version n) → this project's Review version screen (05d), which
 *   needs the project, so it is null without one;
 * - `/chat/<chatId>` → the AI tab with that chat (`/m/ai?chat=<id>`);
 * - anything else → null: the phone has no screen for it.
 */
export function phoneHrefOf(webHref: string, projectId?: string): string | null {
  if (webHref.startsWith("/projects/")) return `/m${webHref}`;
  const build = /^\/build\/([^/?#]+)/.exec(webHref);
  if (build) return projectId ? `${phoneProjectPath(projectId, "review")}?build=${build[1]}` : null;
  const chat = /^\/chat\/([^/?#]+)/.exec(webHref);
  if (chat) return `/m/ai?chat=${chat[1]}`;
  return null;
}

// ─────────────────────────── the Bottom action bar (M4) ───────────────────────────

export type PhoneBar =
  /** State=Draft: Publish (primary) beside Earn. */
  | { kind: "pair"; publishPrimary: boolean; earnFact: string | null }
  /** State=Listed: Earn alone, full width, its fact under it. */
  | { kind: "earn"; fact: string | null };

/**
 * The bar fixed to the foot (owner decision M4): Publish + Earn while Publish has options (a
 * Draft, a Private project), else Earn alone with its live fact (Listed, Sold 40%, Given to the
 * community). Publish is the screen's one primary unless a newer version waits to be reviewed —
 * then the Overview banner's Review version is, and Publish goes quiet (05b).
 */
export function phoneBarOf(input: {
  publishOptions: readonly PublishIntent[] | null;
  earn: Pick<EarnButton, "sub"> | null;
  reviewPending: boolean;
}): PhoneBar | null {
  if (input.publishOptions && input.publishOptions.length) {
    return { kind: "pair", publishPrimary: !input.reviewPending, earnFact: input.earn?.sub ?? null };
  }
  if (input.earn) return { kind: "earn", fact: input.earn.sub };
  return null;
}

/** The Publish sheet's line under its title: the web's wording for each starting point. */
export function publishLineOf(status: string): string {
  return status === "draft" ? "Choose how it goes out. Each one mints it to your name first." : "It's minted and private. Choose how it goes out.";
}

// ─────────────────────────── Delete (07c, 22a–22i) ───────────────────────────

export type DeleteFix = { label: string; place: "sell" | "splits" };

/** A blocked delete (22b, 22f–22i): the web's reason and way out, and where to fix it when the
 *  phone can open that place — Earn › Sell for a listing or an auction, Splits for co-owners. A
 *  sale and unreadable records have nothing to open, so the sheet only closes. */
export function deleteFixOf(block: Pick<DeleteBlock, "id">): DeleteFix | null {
  switch (block.id) {
    case "listed":
    case "auction":
      return { label: "Go to Earn › Sell", place: "sell" };
    case "otherOwners":
      return { label: "Open Splits", place: "splits" };
    case "sold":
    case "marketUnreadable":
      return null;
  }
}

// ─────────────────────────── Review version n (05d) ───────────────────────────

export type ChangeLine = { name: string; line: string; tone: "new" | "changed" | "same" | "dropped" };

/**
 * 05d's "What changed": one line per product, new first, then changed, unchanged and dropped,
 * from save-step's `versionChangesOf` names and the products the new build holds.
 * - New: "New in version {n}" (with its pieces when known);
 * - Changed: "Changed in version {n}";
 * - the rest of the new build: "Same as version {n-1}";
 * - Dropped: "Not in version {n} · it stays in version {n-1}".
 */
export function changeLinesOf(input: {
  version: number;
  added: readonly string[];
  updated: readonly string[];
  dropped: readonly string[];
  /** Every product the new build holds, in its order. */
  products: readonly string[];
  /** Pieces per new product name, when the build counts them. */
  pieces?: Readonly<Record<string, number>>;
}): ChangeLine[] {
  const v = input.version;
  const before = Math.max(1, v - 1);
  const key = (s: string) => s.trim().toLowerCase();
  const added = new Set(input.added.map(key));
  const updated = new Set(input.updated.map(key));
  const out: ChangeLine[] = [];
  for (const name of input.products) {
    if (!added.has(key(name))) continue;
    const n = input.pieces?.[name];
    out.push({ name, tone: "new", line: n ? `New in version ${v} · ${n} pieces` : `New in version ${v}` });
  }
  for (const name of input.products) {
    if (updated.has(key(name)) && !added.has(key(name))) out.push({ name, tone: "changed", line: `Changed in version ${v}` });
  }
  for (const name of input.products) {
    if (!added.has(key(name)) && !updated.has(key(name))) out.push({ name, tone: "same", line: `Same as version ${before}` });
  }
  for (const name of input.dropped) {
    out.push({ name, tone: "dropped", line: `Not in version ${v} · it stays in version ${before}` });
  }
  return out;
}

// ─────────────────────────── someone else's project (Feed) ───────────────────────────

/**
 * An address that isn't one of the viewer's own projects may be another creator's shared sample
 * project, as the Feed links it (`/m/projects/p1`): the web's sample post for that feed id (or
 * slug), which the page shows read-only, as a viewer sees it. Null when it is neither — the page
 * then says it couldn't find the project.
 */
export function sampleProjectOf(id: string): InnovationPost | null {
  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS.find((p) => p.slug === id);
  return project ? samplePostOf(project) : null;
}

/** A viewer's tabs (Figma 18b): no Activity tab — the project's activity is on its Overview. */
export const VIEWER_TABS: readonly { id: PhoneTab; label: string }[] = PHONE_TABS.filter((t) => t.id !== "activity");

/** `?tab=` for a viewer: `marketplace` (the Feed's buy link) is the Overview, where the
 *  Marketplace block is; so is anything else the viewer has no tab for. */
export function parseViewerTab(raw: string | null | undefined): PhoneTab {
  return VIEWER_TABS.some((t) => t.id === raw) ? (raw as PhoneTab) : "overview";
}

/** Buying is Explore marketplace's, which the phone hasn't opened yet. */
export const BUY_LATER = "Buying from the phone opens with Explore marketplace. For now, buy it on the web.";

// ─────────────────────────── small words ───────────────────────────

/** The phone has no Innovations: its Home is the Feed (owner, 2026-10-31). A line the shared
 *  logic words for the web ("Shared to Innovations") reads "Shared to Feed" on the phone. */
export function phoneWords(text: string): string {
  return text.replace(/\bthe Innovations page\b/g, "Feed").replace(/\bInnovations\b/g, "Feed");
}

/** A product's role in a network, in the Figma note's plain words (06d–06h 10422:10253:
 *  "leads / follows / works as an equal"), never Master / Slave. */
export const PHONE_ROLE_LABEL: Record<Role, string> = {
  Master: "Leads",
  Slave: "Follows",
  Peer: "Works as an equal",
  Independent: "Works on its own",
  Gateway: "Gateway",
  Standby: "Follows (standby)",
};

/** "3 of 3 ready" — the readiness sheet's group count. */
export function readyOfLine(ready: number, total: number): string {
  return `${ready} of ${total} ready`;
}

/** The Products tab shows Search and Sort only from 6 products (Figma 02 note). */
export const PRODUCT_TOOLS_FROM = 6;

export type ProductSort = "project" | "name";

/** The Products tab's Sort (02): the project's own order, or by name. */
export const PRODUCT_SORTS: readonly { value: ProductSort; label: string }[] = [
  { value: "project", label: "Project order" },
  { value: "name", label: "Name A–Z" },
];

/** `?psort=` as the Products tab reads it. */
export function parseProductSort(raw: string | null | undefined): ProductSort {
  return raw === "name" ? "name" : "project";
}

/** The Products tab's search and sort over its rows: a case-blind match on the name or the
 *  description, then the order picked. */
export function filterProductRows<T extends { name: string; description?: string }>(
  rows: readonly T[],
  query: string,
  sort: ProductSort,
): T[] {
  const q = query.trim().toLowerCase();
  const kept = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)) : [...rows];
  if (sort === "name") kept.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
  return kept;
}
