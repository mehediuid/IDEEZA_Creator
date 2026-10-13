// JOURNEY — a project's Activity: the proof-backed journey of the project, each
// product, and its Main, Physical and Virtual NFTs (spec
// docs/superpowers/specs/2026-10-13-activity-everywhere-design.md; v1 was
// P2-TABS-5…12). Pure: the targets, each target's catalogue, the stored record
// and its v1 read, the form's check, the default Planning, the read helpers and
// the price snapshot. Storage and IndexedDB are journey-store.ts's.
//
// Value imports are relative, so `node --test` loads the compiled module.

import type { EditionKind, EditionUse } from "../market/types";
import type { Token } from "../brief/types";

// ─────────────────────────── targets (spec §1) ───────────────────────────

/** The whole project's copies — lib/market's `PROJECT_SCOPE`, written as a literal so lib/manual
 *  gains no market value import (journey.test.mjs pins the two equal). */
export const WHOLE_PROJECT_SCOPE = "project";

/** Whose activity an entry is. Personal and Business use share one Physical / Virtual target. */
export type ActivityTarget =
  | { kind: "project" }
  | { kind: "product"; productId: string }
  | { kind: "main" }
  | { kind: "physical" | "virtual"; scope: string };

/** One string per target: "project", "product:prd_1", "main", "physical:project", "virtual:prd_1". */
export function targetKey(t: ActivityTarget): string {
  switch (t.kind) {
    case "project":
    case "main":
      return t.kind;
    case "product":
      return `product:${t.productId}`;
    default:
      return `${t.kind}:${t.scope}`;
  }
}

/** Whose journey a drawer or an announcement names: "Smart Lamp", "VoxLamp", "Main NFT",
 *  "VoxLamp · Physical NFT", "Whole project · Virtual NFT". */
export function targetNameOf(t: ActivityTarget, names: { project: string; productName: (id: string) => string }): string {
  switch (t.kind) {
    case "project":
      return names.project;
    case "product":
      return names.productName(t.productId);
    case "main":
      return "Main NFT";
    default: {
      const scope = t.scope === WHOLE_PROJECT_SCOPE ? "Whole project" : names.productName(t.scope);
      return `${scope} · ${t.kind === "physical" ? "Physical NFT" : "Virtual NFT"}`;
    }
  }
}

// ─────────────────────────── catalogues (spec §2) ───────────────────────────

export type TypeDef = { id: string; label: string; short: string; help: string };

const OTHERS: TypeDef = { id: "others", label: "Others", short: "Other", help: "Something that doesn't fit the types above." };

/** Each target kind's types, in order; Others ends every list. A product reads the project's. */
export const CATALOGUES: Readonly<Record<"project" | "main" | "physical" | "virtual", readonly TypeDef[]>> = {
  project: [
    { id: "planning", label: "Planning", short: "Planning", help: "What it is, who it's for, and what it must do." },
    { id: "design", label: "Design", short: "Design", help: "The board, the case and the firmware are drawn up." },
    { id: "prototype", label: "Prototype", short: "Prototype", help: "A first working unit is built." },
    { id: "testing", label: "Testing", short: "Testing", help: "It's been tried out, and problems were found and fixed." },
    { id: "certification", label: "Certification", short: "Certified", help: "Safety and radio approvals, such as CE, FCC or RoHS." },
    {
      id: "ready-for-manufacture",
      label: "Ready for manufacture",
      short: "Mfg ready",
      help: "Files are final; parts and a factory are lined up.",
    },
    { id: "pilot-run", label: "Pilot run", short: "Pilot run", help: "A small first batch, made the way every later one will be." },
    { id: "manufacturing", label: "Manufacturing", short: "Manufacturing", help: "It's being made at volume." },
    { id: "launched", label: "Launched", short: "Launched", help: "It's on sale and reaching people." },
    { id: "improvement", label: "Improvement", short: "Improved", help: "A new version or a fix after launch." },
    OTHERS,
  ],
  main: [
    { id: "ip", label: "IP / Patent", short: "IP", help: "A patent, trademark or design right was filed or granted." },
    { id: "partnership", label: "Partnership", short: "Partnership", help: "A deal with a factory, distributor or partner." },
    { id: "sales-report", label: "Sales report", short: "Sales", help: "What sold and what it earned." },
    { id: "milestone", label: "Milestone", short: "Milestone", help: "An award, press, or a goal reached." },
    { id: "roadmap", label: "Roadmap", short: "Roadmap", help: "What's coming next." },
    OTHERS,
  ],
  physical: [
    { id: "making", label: "Making", short: "Making", help: "Units for this batch are being made." },
    { id: "quality-check", label: "Quality check", short: "QC", help: "Units were tested before packing." },
    { id: "shipped", label: "Shipped", short: "Shipped", help: "Units were handed to the courier." },
    { id: "delivered", label: "Delivered", short: "Delivered", help: "Everyone who bought one has it." },
    { id: "delay-notice", label: "Delay notice", short: "Delayed", help: "Something is late, and here's the new date." },
    { id: "fix-notice", label: "Fix notice", short: "Fix", help: "A problem was found in shipped units, and here's the fix." },
    OTHERS,
  ],
  virtual: [
    { id: "files-released", label: "Files released", short: "Released", help: "The first version of the files is out." },
    { id: "update-released", label: "Update released", short: "Updated", help: "A new version, and what changed." },
    { id: "bug-fix", label: "Bug fix", short: "Fix", help: "A problem in the files was fixed." },
    { id: "guide-added", label: "Guide added", short: "Guide", help: "A build guide, video or document was added." },
    { id: "licence-change", label: "Licence change", short: "Licence", help: "What people who bought it may do with the files changed." },
    OTHERS,
  ],
};

export function catalogueOf(t: ActivityTarget): readonly TypeDef[] {
  return CATALOGUES[t.kind === "product" ? "project" : t.kind];
}

export function typeDefOf(t: ActivityTarget, typeId: string): TypeDef | null {
  return catalogueOf(t).find((d) => d.id === typeId) ?? null;
}

/** v1's stages (Figma's 11 plus Others) → today's project types (spec §2.5). */
export const LEGACY_TYPES: ReadonlyMap<string, string> = new Map([
  ["concept-definition", "planning"],
  ["requirement-gathering", "planning"],
  ["preliminary-architecture", "design"],
  ["digital-design", "design"],
  ["integration-review", "design"],
  ["prototype-development", "prototype"],
  ["testing-refinement", "testing"],
  ["manufacturing-preparation", "ready-for-manufacture"],
  ["pilot-production-run", "pilot-run"],
  ["mass-production", "manufacturing"],
  ["product-launch-feedback", "launched"],
  ["others", "others"],
]);

// ─────────────────────────── the record (spec §3) ───────────────────────────

export type MediaRef = {
  id: string;
  name: string;
  mime: string;
  kind: "image" | "video" | "pdf" | "doc";
  size: number;
  blobKey: string;
  posterKey?: string;
  width?: number;
  height?: number;
};

export type PriceSnapshot = {
  at: number;
  token: Token;
  /** decimal string, as listed */
  main?: string;
  editions: { productId: string; kind: EditionKind; use: EditionUse; regular: string; extended: string }[];
};

export type Activity = {
  v: 2;
  id: string;
  projectId: string;
  target: ActivityTarget;
  /** An id from the target's catalogue. */
  type: string;
  /** Others only. */
  customName?: string;
  description: string;
  urls: string[];
  media: MediaRef[];
  pricing?: PriceSnapshot;
  createdAt: number;
  updatedAt: number;
};

/** A history row: a stored entry, or the synthesized default Planning (spec §4). */
export type JourneyEntry = Activity & { isDefault?: true };

export type ProjectJourney = { v: 1; activities: Activity[] };
export const JOURNEY_KEY = (id: string) => `ideeza:project:journey:${id}`;

// ─────────────────────────── normalize (drops a malformed entry) ───────────────────────────

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function normalizeMedia(raw: unknown): MediaRef | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const name = str(r.name);
  const mime = str(r.mime);
  const blobKey = str(r.blobKey);
  const size = num(r.size);
  const kind = r.kind;
  if (!id || !name || !mime || !blobKey || size === null) return null;
  if (kind !== "image" && kind !== "video" && kind !== "pdf" && kind !== "doc") return null;
  const out: MediaRef = { id, name, mime, kind, size, blobKey };
  const posterKey = str(r.posterKey);
  if (posterKey) out.posterKey = posterKey;
  const width = num(r.width);
  if (width !== null) out.width = width;
  const height = num(r.height);
  if (height !== null) out.height = height;
  return out;
}

function normalizePriceSnapshot(raw: unknown): PriceSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const at = num(r.at);
  const token = str(r.token);
  if (at === null || !token) return undefined;
  const editions = Array.isArray(r.editions)
    ? (r.editions as unknown[]).flatMap((e) => {
        if (!e || typeof e !== "object") return [];
        const x = e as Record<string, unknown>;
        const productId = str(x.productId);
        const regular = str(x.regular);
        const extended = str(x.extended);
        if (!productId || !regular || !extended) return [];
        const kind: EditionKind | null = x.kind === "physical" || x.kind === "virtual" ? x.kind : null;
        const use: EditionUse | null = x.use === "private" || x.use === "commercial" ? x.use : null;
        if (!kind || !use) return [];
        return [{ productId, kind, use, regular, extended }];
      })
    : [];
  const out: PriceSnapshot = { at, token: token as Token, editions };
  const main = str(r.main);
  if (main) out.main = main;
  return out;
}

function normalizeTarget(raw: unknown): ActivityTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case "project":
      return { kind: "project" };
    case "main":
      return { kind: "main" };
    case "product": {
      const productId = str(r.productId);
      return productId ? { kind: "product", productId } : null;
    }
    case "physical":
    case "virtual": {
      const scope = str(r.scope);
      return scope ? { kind: r.kind, scope } : null;
    }
    default:
      return null;
  }
}

/** A v2 entry as stored, or a v1 entry read as v2: no `target` means v1, whose `productId` names
 *  the product (absent = the project) and whose stage maps through LEGACY_TYPES. A type its
 *  target's catalogue doesn't offer drops the entry. */
function normalizeActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const projectId = str(r.projectId);
  const rawType = str(r.type);
  const description = str(r.description);
  const createdAt = num(r.createdAt);
  const updatedAt = num(r.updatedAt);
  if (!id || !projectId || !rawType || description === null || createdAt === null || updatedAt === null) return null;
  const v1 = r.target === undefined;
  const legacyProduct = str(r.productId);
  const target: ActivityTarget | null = v1
    ? legacyProduct
      ? { kind: "product", productId: legacyProduct }
      : { kind: "project" }
    : normalizeTarget(r.target);
  if (!target) return null;
  const type = v1 ? (LEGACY_TYPES.get(rawType) ?? null) : rawType;
  if (!type || !typeDefOf(target, type)) return null;
  const urls = Array.isArray(r.urls) ? r.urls.filter((u): u is string => typeof u === "string") : [];
  const media = Array.isArray(r.media)
    ? (r.media as unknown[]).map(normalizeMedia).filter((m): m is MediaRef => m !== null)
    : [];
  const out: Activity = { v: 2, id, projectId, target, type, description, urls, media, createdAt, updatedAt };
  const customName = str(r.customName);
  if (customName) out.customName = customName;
  const pricing = normalizePriceSnapshot(r.pricing);
  if (pricing) out.pricing = pricing;
  return out;
}

/** Drops a malformed entry and keeps the rest; a wholly unreadable record reads as an empty journey. */
export function normalizeJourney(raw: unknown): ProjectJourney {
  if (!raw || typeof raw !== "object") return { v: 1, activities: [] };
  const r = raw as Record<string, unknown>;
  const activities = Array.isArray(r.activities)
    ? (r.activities as unknown[]).map(normalizeActivity).filter((a): a is Activity => a !== null)
    : [];
  return { v: 1, activities };
}

// ─────────────────────────── the form's check (spec §5) ───────────────────────────

export type ActivityInput = {
  type: string;
  customName: string;
  description: string;
  urls: string[];
  /** Files attached and saved or saving — real uploads, never a fake percentage (ACT-62). */
  attachments: number;
};

export type ActivityErrors = {
  type: string | null;
  customName: string | null;
  description: string | null;
  /** One entry per `input.urls`, in order. */
  urls: (string | null)[];
  attachments: string | null;
  ok: boolean;
};

const CUSTOM_NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const HTTPS_ERROR = "Please enter a valid URL starting with https://";
/** Proof is a file (owner, 2026-10-13): a link alone never saves. */
export const PROOF_MISSING = "Add at least one photo, video, PDF or document.";

function isHttpsUrl(u: string): boolean {
  return /^https:\/\//i.test(u.trim());
}

export function checkActivity(input: ActivityInput): ActivityErrors {
  const type = input.type ? null : "Choose an activity type.";

  let customName: string | null = null;
  if (input.type === "others") {
    const n = Array.from(input.customName.trim()).length;
    if (n === 0) customName = "Name this activity.";
    else if (n > CUSTOM_NAME_MAX) customName = "Maximum 40 characters allowed";
  }

  const descLen = Array.from(input.description.trim()).length;
  const description =
    descLen === 0 ? "Describe this activity." : descLen > DESCRIPTION_MAX ? "Maximum 400 characters allowed" : null;

  const urls = input.urls.map((u) => (isHttpsUrl(u) ? null : HTTPS_ERROR));
  const attachments = input.attachments === 0 ? PROOF_MISSING : null;

  const ok = type === null && customName === null && description === null && urls.every((e) => e === null) && attachments === null;
  return { type, customName, description, urls, attachments, ok };
}

// ─────────────────────────── reads (spec §4, §5) ───────────────────────────

/** A target's stored entries, newest first; equal times by id, descending, so the order is stable. */
export function activitiesOf(j: ProjectJourney, target: ActivityTarget): Activity[] {
  const key = targetKey(target);
  return j.activities
    .filter((a) => targetKey(a.target) === key)
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/** The Planning every project and product starts at: synthesized, never stored, never edited. */
export function defaultPlanningOf(projectId: string, target: ActivityTarget, at: number): JourneyEntry {
  return {
    v: 2,
    id: `default:${targetKey(target)}`,
    projectId,
    target,
    type: "planning",
    description: target.kind === "project" ? "Project created." : "Product added.",
    urls: [],
    media: [],
    createdAt: at,
    updatedAt: at,
    isDefault: true,
  };
}

/** A target's whole history, newest first: its stored entries, then — for the project or a product,
 *  given `defaultAt` (the project's createdAt, or when the product joined) — its default Planning,
 *  always last. An NFT has no default. */
export function historyOf(j: ProjectJourney, projectId: string, target: ActivityTarget, defaultAt?: number): JourneyEntry[] {
  const list: JourneyEntry[] = activitiesOf(j, target);
  if ((target.kind === "project" || target.kind === "product") && defaultAt !== undefined) {
    list.push(defaultPlanningOf(projectId, target, defaultAt));
  }
  return list;
}

/** The target's current activity: its newest entry, the default included; null for an NFT with none. */
export function currentOf(j: ProjectJourney, projectId: string, target: ActivityTarget, defaultAt?: number): JourneyEntry | null {
  return historyOf(j, projectId, target, defaultAt)[0] ?? null;
}

const DAY_MS = 86_400_000;

/** How old an entry is, in words a buyer reads at a glance: "today", "yesterday", "5 days ago",
 *  "3 weeks ago", "2 months ago". A clock behind the entry reads "today", never negative. */
export function ageOf(at: number, now: number): string {
  const days = Math.floor(Math.max(0, now - at) / DAY_MS);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

type Named = Pick<Activity, "target" | "type" | "customName">;

export function labelOf(e: Named): string {
  if (e.type === "others") return e.customName?.trim() || OTHERS.label;
  return typeDefOf(e.target, e.type)?.label ?? "Activity";
}

export function shortOf(e: Named): string {
  if (e.type === "others") return e.customName?.trim() || OTHERS.short;
  return typeDefOf(e.target, e.type)?.short ?? "Activity";
}

export function helpOf(e: Named): string {
  return typeDefOf(e.target, e.type)?.help ?? "";
}

// ─────────────────────────── the price snapshot (P2-TABS-11) ───────────────────────────

/** What `snapshotPrices` reads, supplied by the caller from LISTING's `ListingView` and this
 *  area's live `EditionTrack`s (T7 of tabs.md's shared-contract flags) — never read directly,
 *  so this module needs no market import. `main.at` is the fact's own timestamp (the listing's
 *  `updatedAt`), so this stays pure: no clock of its own. */
export type LiveListingFacts = {
  main?: { token: Token; price: string; at: number };
  editions: { productId: string; kind: EditionKind; use: EditionUse; regular: string; extended: string }[];
};

/** A snapshot taken the moment an activity is saved while something is live — or `undefined`
 *  when nothing was (ACT-98: editing never re-snapshots, and this never reads a listing itself). */
export function snapshotPrices(listings: LiveListingFacts): PriceSnapshot | undefined {
  if (!listings.main) return undefined;
  return {
    at: listings.main.at,
    token: listings.main.token,
    main: listings.main.price,
    editions: listings.editions,
  };
}
