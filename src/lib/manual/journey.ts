// JOURNEY — the Activity History (P2-TABS-5…12), consolidated spec §3.5.9,
// area file tabs.md §B. Pure: types, the 11 stages plus Others, the form's
// checks, the read helpers and the price snapshot. Storage and IndexedDB are
// journey-store.ts's (T11).
//
// Value imports are relative, so `node --test` loads the compiled module.

import type { EditionKind, EditionUse } from "../market/types";
import type { Token } from "../brief/types";

// ─────────────────────────── stages ───────────────────────────

export type StageId =
  | "concept-definition"
  | "requirement-gathering"
  | "preliminary-architecture"
  | "digital-design"
  | "integration-review"
  | "prototype-development"
  | "testing-refinement"
  | "manufacturing-preparation"
  | "pilot-production-run"
  | "mass-production"
  | "product-launch-feedback"
  | "others";

export type StageDef = { id: StageId; label: string; short: string; help: string };

/** The 11 stages plus Others, in Figma order (ACT-48). Short labels are P2-TABS-10's draft. */
export const STAGES: readonly StageDef[] = [
  {
    id: "concept-definition",
    label: "Concept Definition",
    short: "Concept",
    help: "The idea is written down: what it is, who it's for, why it's worth building.",
  },
  {
    id: "requirement-gathering",
    label: "Requirement Gathering",
    short: "Requirements",
    help: "What the product must do is listed out, before any design starts.",
  },
  {
    id: "preliminary-architecture",
    label: "Preliminary Architecture",
    short: "Architecture",
    help: "The rough shape of the system — its parts and how they connect.",
  },
  {
    id: "digital-design",
    label: "Digital Design",
    short: "Design",
    help: "The board, enclosure and firmware are drawn up in detail.",
  },
  {
    id: "integration-review",
    label: "Integration Review",
    short: "Integration",
    help: "The parts are checked together, before anything is built.",
  },
  {
    id: "prototype-development",
    label: "Prototype Development",
    short: "Prototype",
    help: "A working, one-off build, made to prove the design.",
  },
  {
    id: "testing-refinement",
    label: "Testing & Refinement",
    short: "Testing",
    help: "The prototype is tried, and the design is fixed where it falls short.",
  },
  {
    id: "manufacturing-preparation",
    label: "Manufacturing Preparation",
    short: "Mfg prep",
    help: "Getting ready to make more than one: files, sourcing, tooling.",
  },
  {
    id: "pilot-production-run",
    label: "Pilot Production Run",
    short: "Pilot run",
    help: "A small batch, made the way every later one will be.",
  },
  {
    id: "mass-production",
    label: "Mass Production",
    short: "Production",
    help: "The product is made at volume.",
  },
  {
    id: "product-launch-feedback",
    label: "Product Launch & Feedback",
    short: "Launch",
    help: "It's out. What happens next is what buyers say about it.",
  },
  {
    id: "others",
    label: "Others",
    short: "Other",
    help: "Something that doesn't fit the stages above.",
  },
];

const STAGE_IDS: ReadonlySet<StageId> = new Set(STAGES.map((s) => s.id));
const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

// ─────────────────────────── the record ───────────────────────────

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
  v: 1;
  id: string;
  projectId: string;
  /** absent = "Whole project" */
  productId?: string;
  type: StageId;
  customName?: string;
  description: string;
  urls: string[];
  media: MediaRef[];
  pricing?: PriceSnapshot;
  createdAt: number;
  updatedAt: number;
};

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

function normalizeActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const projectId = str(r.projectId);
  const type = r.type;
  const description = str(r.description);
  const createdAt = num(r.createdAt);
  const updatedAt = num(r.updatedAt);
  if (!id || !projectId || typeof type !== "string" || !STAGE_IDS.has(type as StageId)) return null;
  if (description === null || createdAt === null || updatedAt === null) return null;
  const urls = Array.isArray(r.urls) ? r.urls.filter((u): u is string => typeof u === "string") : [];
  const media = Array.isArray(r.media)
    ? (r.media as unknown[]).map(normalizeMedia).filter((m): m is MediaRef => m !== null)
    : [];
  const out: Activity = {
    v: 1,
    id,
    projectId,
    type: type as StageId,
    description,
    urls,
    media,
    createdAt,
    updatedAt,
  };
  const productId = str(r.productId);
  if (productId) out.productId = productId;
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

// ─────────────────────────── the form's check (P2-TABS-7) ───────────────────────────

export type ActivityInput = {
  type: StageId | "";
  customName: string;
  description: string;
  urls: string[];
  /** The count of attached files — real uploads, never a fake percentage (ACT-62). */
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

function isHttpsUrl(u: string): boolean {
  return /^https:\/\//i.test(u.trim());
}

/** The exact copy of P2-TABS-7 (carried from ACT-43…63). `products` is the project's product
 *  count — a UI concern (whether to show the Product select); it never changes what's valid. */
export function checkActivity(input: ActivityInput, products: number): ActivityErrors {
  void products;
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

  const attachments = input.urls.length === 0 && input.attachments === 0 ? "Add at least one file or link." : null;

  const ok = type === null && customName === null && description === null && urls.every((e) => e === null) && attachments === null;

  return { type, customName, description, urls, attachments, ok };
}

// ─────────────────────────── reads (P2-TABS-5, 9, 10) ───────────────────────────

/** The journey's entries for a scope, newest first. On the project page (`productId`
 *  undefined) that's every entry; on a product page it's this product's, plus every
 *  untagged "Whole project" entry (P2-TABS-5). */
export function activitiesFor(j: ProjectJourney, scope: { productId?: string }): Activity[] {
  const list =
    scope.productId === undefined
      ? j.activities
      : j.activities.filter((a) => a.productId === undefined || a.productId === scope.productId);
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

/** The newest non-Others stage — of the whole list, or (with `productId`) of only the
 *  entries tagged to that product (untagged ones don't count here, unlike `activitiesFor`). */
export function currentStage(list: readonly Activity[], productId?: string): StageDef | null {
  const scoped = productId === undefined ? list : list.filter((a) => a.productId === productId);
  const newest = [...scoped].filter((a) => a.type !== "others").sort((a, b) => b.createdAt - a.createdAt)[0];
  return newest ? (STAGE_BY_ID.get(newest.type) ?? null) : null;
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
