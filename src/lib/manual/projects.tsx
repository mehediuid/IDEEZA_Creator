"use client";

// ManualProjectsProvider — store for projects created via the Build
// Manually flow (home → "Create Project" modal). Each project owns:
//
//   • Identity     — id, name, description
//   • Timestamps   — createdAt, updatedAt
//   • Status       — "draft" while the user is iterating; flips to
//                    "completed" when the Brief step is saved off.
//   • flowState    — per-step completion booleans (PCB / Code / 3D /
//                    Preview / Brief). Owned PER PROJECT so editing
//                    project A doesn't pollute project B's progress.
//
// Plus the "active project" — the project the editor pages
// (/pcb /code /3d /preview /brief) are currently working on. The
// RequireActiveProject route gate redirects to "/" when null.
//
// Persists to localStorage so a refresh keeps every project and the
// active selection.

import * as React from "react";
import { deleteNetwork } from "../network/store";
import {
  currentWriteError,
  reportWrite,
  subscribeWriteError,
  type WriteError,
} from "../storage-status";
import { sweepProjectKeys } from "./project-storage";
import { productsOf, type BuildJob, type BuildProduct } from "../create/history";
// A runtime cycle: project-read.ts takes only types from this file, but it
// loads project-summary.ts and ../brief/project-brief, and both load this file.
// It is safe only because no module in it uses another's exports while
// loading — only from inside functions. editor-scope.ts, contributors.ts and
// ../wallet/mint.ts join the same cycle on the same terms.
import { lineageProjectOf, modelNameOf } from "./project-read";
import { renameProduct as renameProductPatch, stampEditorOpened } from "./editor-scope";
import {
  CONTRIBUTOR_NAME_MAX,
  CONTRIBUTORS_MAX,
  contributorsIn,
  newContributorId,
  withContributor,
  withoutContributor,
} from "./contributors";
import { normalizeLegal } from "./legal";
import { dispatchProjectDeleted } from "./events";
import { normalizeMintRecord } from "../wallet/mint";
import type { MintRecord } from "../wallet/types";
import type {
  Contributor,
  ContributorRole,
  DescriptionHint,
  EditorScope,
  EditorStep,
  ProjectLegal,
} from "./p2-types";

export type ManualProjectStatus = "draft" | "completed";

export type ManualFlowState = {
  pcb: boolean;
  code: boolean;
  three: boolean;
  assembly: boolean;
  wiring: boolean;
  preview: boolean;
  brief: boolean;
};

export const EMPTY_FLOW_STATE: ManualFlowState = {
  pcb: false,
  code: false,
  three: false,
  assembly: false,
  wiring: false,
  preview: false,
  brief: false,
};

/** The build product a project product was last built from: the build, and the product inside it —
 *  "primary" or the companion's BuildProduct.id. A reference, never a copy. */
export type ProductSource = { buildId: string; productId: string };

/** One product inside a project — the name and the sentence the model wrote
 *  for it, which is what the Brief shows and what My projects counts. */
export type ManualProduct = {
  /** Stable key for /projects/[id]/products/[productId]. New rows: `prd_` + 8 base-36 chars.
   *  Legacy rows get `p<n>` (1-based position, deduped) once, in normalizeProjects. Never reused. */
  id: string;
  name: string;
  description: string;
  /** Absent on a hand-made product, and on a legacy row until a version attaches to it. */
  source?: ProductSource;
  /** The last change to THIS row: a version attached to it, or its text edited. Absent = never recorded. */
  updatedAt?: number;
};

/** A product row as a writer hands it over. Without an id, keepProductIds gives it the id of the
 *  row it replaces. */
export type ManualProductInput = Omit<ManualProduct, "id"> & { id?: string };

/** One build the project holds. */
export type ProjectBuildRef = {
  buildId: string;
  /** The chat it came from: its lineage. Null only for a build gone before this was recorded. */
  chatId: string | null;
  /** 1-based within its lineage (same chatId), in save order. Never renumbered or reused. */
  version: number;
  /** When it joined this project. Null = joined before this field existed (the page says nothing). */
  savedAt: number | null;
};

export type ProjectStep = keyof ManualFlowState;

export type ManualProject = {
  id: string;
  // URL-safe handle derived from the name (e.g. "my-drone-project"). Stable
  // identity in the address bar — the editor lives at /project/<slug>/<step>.
  slug: string;
  name: string;
  // The product being built inside this project. Editable inline from the
  // editor chrome; shown as "Untitled product" until the user names it.
  productName: string;
  description: string;
  /** Every product this project holds, named and described by the model.
   *  §4.4.8 puts a whole system in one project, so a drone, its remote and
   *  its charger are three products under one name — and `productName` alone
   *  could only ever record the first of them. The headline product stays in
   *  `productName`/`description` so every surface that reads those is
   *  unchanged; this is the full list. Absent on a hand-made project, which
   *  has the one product the maker typed. */
  products?: ManualProduct[];
  status: ManualProjectStatus;
  createdAt: number;
  updatedAt: number;
  flowState: ManualFlowState;
  /** The build this project was CREATED from (Save Project / Advance Edit on the review surface).
   *  Provenance; never the only read (COR-86). Absent for a hand-made project. */
  buildId?: string;
  /** Every build the project holds, in attach order. Written from now on; legacy projects are read by buildsOf(). */
  builds?: ProjectBuildRef[];
  /** The editor step last opened, and on which product row (Phase 2). Open in editor's resume
   *  target — never a progress signal. */
  lastOpened?: { step: ProjectStep; at: number; productId?: string };
  /** Per product row id: the editor step last opened on it (P2-EDITOR-7). */
  editorOpened?: Record<string, { step: EditorStep; at: number }>;
  /** Showcase (COR-105): a time = showcased since then; null = the maker stopped; absent = never recorded.
   *  A flag on the project, orthogonal to the outcome — never derived from the Brief's shareToNewsfeed. */
  showcasedAt?: number | null;
  /** The cover the maker chose ("Use as cover", CNT-15): the build product whose image is the project's
   *  cover, winning over coverOf()'s default (LST-34). null = the maker stopped using it, so the default
   *  applies again; absent = never chosen. A reference, never an image URL (§5.1.10). A later ProjectCover
   *  with a `kind` reads this shape as kind "concept" (§7 X10). */
  cover?: ProductSource | null;
  /** The demo mint (P2-MINT-8): written only by the mint and listing commits (`setMint`). */
  mint?: MintRecord;
  /** The people the owner added, with their role and share (decision 2, P2-CONTRIB). */
  contributors?: Contributor[];
  /** When "I confirm I am the rightful owner of this idea" was ticked (VIDEO). */
  ownerConfirmedAt?: number;
  /** The rail Legal block's details (TABS). */
  legal?: ProjectLegal;
  /** The description coachmark, dismissed (P2-TABS-22). */
  descriptionHint?: DescriptionHint;
};

/** What updateProject takes. Its product rows may come without ids (the Brief's Step 1 writes
 *  `{ name, description }`); keepProductIds gives each the id of the row it replaces. */
export type ProjectPatch = Partial<Omit<ManualProject, "id" | "products">> & {
  products?: ManualProductInput[];
};

export const PROJECT_NAME_MAX = 80; // CNT-2: trimmed, 1–80 characters
export const PROJECT_DESC_MAX = 1000; // CNT-5: trimmed, 0–1,000 characters…
export const PROJECT_DESC_COUNTER_FROM = 800; // …with a counter from 800

/** The key this store writes its projects to — and reports a refused write under (COR-93). */
export const PROJECTS_KEY = "ideeza:manual:projects";
const ACTIVE_KEY = "ideeza:manual:active";

/** Whether this store's own write of the projects was refused at or after
 *  `since` — what an inline edit started then has to treat as its failure.
 *  A refused write of another key (the create store's chats or builds) isn't
 *  one: the edit may well have saved. */
export function projectWriteRefused(err: WriteError | null, since: number): boolean {
  return err !== null && err.key === PROJECTS_KEY && err.at >= since;
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
/** Writes one key; false when the browser refused it — storage full (COR-93). */
function saveJSON<T>(key: string, v: T): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function saveActiveId(id: string | null): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_KEY);
    else window.localStorage.setItem(ACTIVE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

// useSyncExternalStore's server snapshot: nothing has failed before hydration.
const NO_WRITE_ERROR = (): WriteError | null => null;

function makeId(): string {
  return `proj_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

// Kebab-case a project name into a URL-safe slug.
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

/** A slug that doesn't collide with any existing project: appends -2, -3, …
 *  Exported for `saveRecord`'s ids (the provider picks them, so the pure core
 *  stays deterministic). */
export function uniqueSlug(name: string, existing: readonly ManualProject[]): string {
  const base = slugify(name);
  const taken = new Set(existing.map((p) => p.slug).filter(Boolean));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const norm = (s: string) => s.trim().toLowerCase();

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** A new product row's id (§5.1.10): `prd_` + 8 random base-36 characters,
 *  so an id is never reused after its product leaves. */
export function newProductId(): string {
  let id = "prd_";
  for (const b of crypto.getRandomValues(new Uint8Array(8))) id += BASE36[b % 36];
  return id;
}

function sourceIn(v: unknown): ProductSource | undefined {
  return isRecord(v) && typeof v.buildId === "string" && typeof v.productId === "string"
    ? { buildId: v.buildId, productId: v.productId }
    : undefined;
}

// Whether a stored row already is its normalized form, key for key.
function sameRow(x: Record<string, unknown>, row: ManualProduct): boolean {
  const s = x.source;
  return (
    Object.keys(x).length === Object.keys(row).length &&
    x.id === row.id &&
    x.name === row.name &&
    x.description === row.description &&
    x.updatedAt === row.updatedAt &&
    (row.source
      ? isRecord(s) &&
        Object.keys(s).length === 2 &&
        s.buildId === row.source.buildId &&
        s.productId === row.source.productId
      : s === undefined)
  );
}

// COR-87 — a project's product rows: identity, text and provenance. A stored
// id is kept when it is a non-empty string no earlier row holds; a row without
// one takes the first free `p<n>` counting up from its own 1-based position —
// once, because the save effect persists it. A source is kept when both its
// fields are strings, updatedAt when it is finite; a row without a string name
// is dropped. Returns `raw` itself when every row is already in this form, and
// undefined when no row is left.
function productsIn(raw: unknown): ManualProduct[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw.filter(
    (x): x is Record<string, unknown> & { name: string } =>
      isRecord(x) && typeof x.name === "string",
  );
  if (!rows.length) return undefined;
  const taken = new Set<string>();
  const stored = rows.map((x) => {
    const id = typeof x.id === "string" && x.id && !taken.has(x.id) ? x.id : null;
    if (id) taken.add(id);
    return id;
  });
  let same = rows.length === raw.length;
  const out = rows.map((x, i): ManualProduct => {
    let id = stored[i];
    if (id === null) {
      let n = i + 1;
      while (taken.has(`p${n}`)) n++;
      id = `p${n}`;
      taken.add(id);
    }
    const source = sourceIn(x.source);
    const row: ManualProduct = {
      id,
      name: x.name,
      description: String(x.description ?? ""),
      ...(source ? { source } : null),
      ...(isTime(x.updatedAt) ? { updatedAt: x.updatedAt } : null),
    };
    if (!sameRow(x, row)) same = false;
    return row;
  });
  return same ? (raw as ManualProduct[]) : out;
}

const isBuildRef = (r: unknown): r is ProjectBuildRef =>
  isRecord(r) &&
  typeof r.buildId === "string" &&
  r.buildId !== "" &&
  (typeof r.chatId === "string" || r.chatId === null) &&
  typeof r.version === "number" &&
  Number.isInteger(r.version) &&
  r.version >= 1 &&
  (isTime(r.savedAt) || r.savedAt === null);

// COR-86 — the build refs: a string buildId, a chatId that is a string or
// null, an integer version ≥ 1 and a savedAt that is a number or null; a
// build's first ref wins. Never backfilled here — that needs the builds store,
// so buildsOf() reads the legacy links at read time and attach() freezes a
// lineage when it writes.
function buildsIn(raw: unknown): ProjectBuildRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: ProjectBuildRef[] = [];
  for (const r of raw) {
    if (!isBuildRef(r) || seen.has(r.buildId)) continue;
    seen.add(r.buildId);
    out.push({ buildId: r.buildId, chatId: r.chatId, version: r.version, savedAt: r.savedAt });
  }
  if (!out.length) return undefined;
  const same = out.length === raw.length && raw.every((r) => Object.keys(r).length === 4);
  return same ? (raw as ProjectBuildRef[]) : out;
}

// Whether two JSON values are the same, key order aside — so a normalizer
// that always builds a fresh object can still hand the stored one back.
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a))
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => sameJson(x, b[i]));
  if (!isRecord(a) || !isRecord(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameJson(a[k], b[k]))
  );
}
/** `clean` (a normalizer's answer), or `raw` itself when that is what it already was. */
function keepSame<T>(raw: unknown, clean: T | undefined): T | undefined {
  return clean !== undefined && sameJson(raw, clean) ? (raw as T) : clean;
}

// Row ids hold no ":" (§3.1), and a key built from one mustn't either.
const isRowId = (v: unknown): v is string => typeof v === "string" && v !== "" && !v.includes(":");

// COR-91 — kept when its step is one of FLOW_STEPS and its time is finite; a
// `productId` (P2-EDITOR-7) is kept when it is a row id, else dropped on its
// own. No productId = the first row's record (EDITOR §3.1).
function lastOpenedIn(raw: unknown): ManualProject["lastOpened"] {
  if (!isRecord(raw)) return undefined;
  const step = FLOW_STEPS.find((s) => s === raw.step);
  const at = raw.at;
  if (!step || !isTime(at)) return undefined;
  const productId = isRowId(raw.productId) ? raw.productId : undefined;
  return Object.keys(raw).length === (productId ? 3 : 2) && (productId || !("productId" in raw))
    ? (raw as ManualProject["lastOpened"])
    : { step, at, ...(productId ? { productId } : null) };
}

// P2-EDITOR-7 — an entry is kept when its key is a row id, its step an editor
// step and its time finite; the rest are dropped. No entry left = none.
function editorOpenedIn(raw: unknown): ManualProject["editorOpened"] {
  if (!isRecord(raw)) return undefined;
  const entries = Object.entries(raw);
  let same = true;
  const kept: [string, { step: EditorStep; at: number }][] = [];
  for (const [rowId, v] of entries) {
    const step = isRecord(v)
      ? FLOW_STEPS.find((s): s is EditorStep => s !== "brief" && s === v.step)
      : undefined;
    if (!isRowId(rowId) || !isRecord(v) || !step || !isTime(v.at)) {
      same = false;
      continue;
    }
    if (Object.keys(v).length !== 2) same = false;
    kept.push([rowId, { step, at: v.at }]);
  }
  if (!kept.length) return undefined;
  return same ? (raw as ManualProject["editorOpened"]) : Object.fromEntries(kept);
}

// P2-MINT-8 — through normalizeMintRecord; an invalid one (a string tokenId,
// say) is dropped and the project reads by its Brief again.
function mintIn(raw: unknown): MintRecord | undefined {
  return raw === undefined ? undefined : keepSame(raw, normalizeMintRecord(raw));
}

// P2-CONTRIB-6 — through contributorsIn. `[]` is kept: it means everyone was
// removed, where absent means nobody was ever added.
function contributorsListIn(raw: unknown): Contributor[] | undefined {
  return Array.isArray(raw) && raw.length === 0 ? (raw as Contributor[]) : contributorsIn(raw);
}

// VIDEO — sanitized like showcasedAt: a finite time, else never confirmed.
function ownerConfirmedIn(raw: unknown): number | undefined {
  return isTime(raw) ? raw : undefined;
}

// P2-TABS-23 — through normalizeLegal: an all-empty record reads as never set.
function legalIn(raw: unknown): ProjectLegal | undefined {
  return raw === undefined ? undefined : keepSame(raw, normalizeLegal(raw));
}

// P2-TABS-22 — a finite dismissal time and a whole product count ≥ 0.
function descriptionHintIn(raw: unknown): DescriptionHint | undefined {
  if (!isRecord(raw) || !isTime(raw.dismissedAt)) return undefined;
  const n = raw.productCount;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) return undefined;
  return Object.keys(raw).length === 2
    ? (raw as DescriptionHint)
    : { dismissedAt: raw.dismissedAt, productCount: n };
}

// COR-105 — a time, or null once the maker stopped. Anything else reads as
// never recorded: absent, never null, so the one-time backfill from an older
// mint (project-brief.ts) can still tell "never" from "stopped".
function showcasedIn(raw: unknown): number | null | undefined {
  return isTime(raw) || raw === null ? raw : undefined;
}

// LST-34 — the chosen cover: a product source (both fields strings), or null
// once the maker stopped using it. Anything else reads as never chosen.
function coverIn(raw: unknown): ProductSource | null | undefined {
  if (raw === null) return null;
  const source = sourceIn(raw);
  if (!source) return undefined;
  return isRecord(raw) && Object.keys(raw).length === 2
    ? (raw as ProductSource)
    : source;
}

// The optional fields normalizeProjects keeps, each through its own normalizer.
// Absent (undefined) = the key is dropped.
const KEPT_FIELDS = {
  products: productsIn,
  builds: buildsIn,
  lastOpened: lastOpenedIn,
  editorOpened: editorOpenedIn,
  showcasedAt: showcasedIn,
  cover: coverIn,
  mint: mintIn,
  contributors: contributorsListIn,
  ownerConfirmedAt: ownerConfirmedIn,
  legal: legalIn,
  descriptionHint: descriptionHintIn,
} satisfies { [K in keyof ManualProject]?: (raw: unknown) => ManualProject[K] };

// Normalize projects loaded from storage: backfill slugs (unique within the
// batch), productName and every flow step for projects saved before those
// existed, and keep the fields added since — product ids, sources and times,
// build refs, lastOpened, showcasedAt, cover, and Phase 2's editorOpened,
// mint, contributors, ownerConfirmedAt, legal and descriptionHint (§3.3.5) —
// dropping whatever doesn't parse (COR-87). Returns the same reference when
// nothing changed so React skips needless re-renders; a project that did
// change is written back by the save effect, so a legacy row gets its id
// exactly once.
export function normalizeProjects(list: unknown): ManualProject[] {
  if (!Array.isArray(list)) return [];
  const taken = new Set<string>();
  return list.filter(isRecord).map((raw) => {
    const p = raw as ManualProject;
    // A name that isn't a string reads as none, rather than throwing here or
    // on every surface that trims it.
    const nameOk = typeof p.name === "string";
    const name = nameOk ? p.name : "";
    let slug = p.slug || slugify(name);
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);
    const kept = Object.entries(KEPT_FIELDS).map(
      ([key, keep]) => [key, (keep as (v: unknown) => unknown)(raw[key])] as const,
    );
    // Backfill steps added after a project was saved (e.g. `assembly`,
    // UIUX-80) so flowState always carries every step key. One that isn't an
    // object at all reads as no steps done.
    const flow = isRecord(p.flowState) ? p.flowState : null;
    const flowOk = flow !== null && FLOW_STEPS.every((s) => s in flow);
    if (
      nameOk &&
      p.slug === slug &&
      p.productName !== undefined &&
      flowOk &&
      kept.every(([key, v]) => v === raw[key])
    )
      return p;
    const out: Record<string, unknown> = {
      ...p,
      name,
      slug,
      productName: p.productName ?? "",
      flowState: { ...EMPTY_FLOW_STATE, ...(flow ?? {}) },
    };
    for (const [key, v] of kept) {
      if (v !== undefined) out[key] = v;
      else delete out[key];
    }
    return out as ManualProject;
  });
}

// A write's product rows, each with an id (COR-87). A row carrying an id no
// earlier row holds keeps it. A row without one is the held row it lines up
// with — by position when the list keeps its length, else by name — and takes
// that row's id, source and updatedAt; with no free match it is a new product
// with a new id. No held id goes to two rows. This is what stops the Brief's
// `{ name, description }` writes stripping identity.
export function keepProductIds(
  rows: ManualProductInput[],
  held: ManualProduct[],
): ManualProduct[] {
  const taken = new Set<string>();
  const own = rows.map((r) => {
    const id = r.id && !taken.has(r.id) ? r.id : null;
    if (id) taken.add(id);
    return id;
  });
  const free = (x: ManualProduct | undefined) =>
    x && !taken.has(x.id) ? x : undefined;
  const byPosition = rows.length === held.length;
  return rows.map((r, i): ManualProduct => {
    let id = own[i];
    let match: ManualProduct | undefined;
    if (id === null) {
      match =
        (byPosition ? free(held[i]) : undefined) ??
        held.find((x) => free(x) && norm(x.name) === norm(r.name));
      id = match?.id ?? newProductId();
      taken.add(id);
    }
    const source = r.source ?? match?.source;
    const updatedAt = r.updatedAt ?? match?.updatedAt;
    return {
      id,
      name: r.name,
      description: r.description,
      ...(source ? { source } : null),
      ...(updatedAt !== undefined ? { updatedAt } : null),
    };
  });
}

// The rows a project holds. One without a list — hand-made, or saved before
// lists — holds its headline product, which productsOfProject() calls "p1".
function heldProducts(p: ManualProject): ManualProduct[] {
  return p.products?.length
    ? p.products
    : [{ id: "p1", name: p.productName, description: p.description }];
}

// ─────────────── The writers' pure core (§5.1.7, §5.1.8) ───────────────
//
// No hooks and no storage in here: the provider below applies these to its
// state, and the node:test harness runs them exactly as they are.

/** The sentence the model wrote for a build product — its description, else
 *  its parts line. modelNameOf() (project-read.ts) is the name beside it. */
function modelDescOf(bp: BuildProduct): string {
  return (bp.description || bp.summary || "").trim();
}

/**
 * A build joins a project — the one merge (§5.1.8). Pure: the provider's
 * `attachBuild` runs it on the stored record, and so does every test.
 *
 * `lineage` is the OTHER builds of `job.chatId`. The build is recorded as the
 * next version of its chat inside this project; its products replace the rows
 * the lineage's earlier version made (matched by product id — for a legacy row,
 * the one it was in that earlier build — then by name), a row this version
 * doesn't have stays listed with its old source (COR-108), and every product
 * the project didn't have yet becomes a new row. The maker's own words on a
 * row survive: the model's new words land only where the row still holds the
 * previous version's. Rows from another chat, and hand-made rows, are
 * left alone — except that a hand-made row named like one of this build's
 * products adopts it, which is a build joining a hand-made project.
 */
export function attach(
  p: ManualProject,
  job: BuildJob,
  lineage: BuildJob[],
  now: number,
  opts: { origin?: boolean } = {},
): ManualProject {
  const refs0 = p.builds ?? [];
  // One build, one attach: saving the same build again changes nothing. That
  // includes a build held by a legacy link — the project's origin, or a build
  // whose projectId names it: buildsOf() already numbers it, and freezing its
  // lineage around it here would renumber the versions and lose its save time.
  if (refs0.some((r) => r.buildId === job.id) || job.id === p.buildId || job.projectId === p.id)
    return p;

  // Freeze this lineage's legacy links first — builds that joined before
  // `builds` was recorded — numbered by age after the refs already stored, the
  // way buildsOf() numbers them, so the numbering can never shift later.
  const frozenJobs = lineage
    .filter(
      (b) =>
        b.id !== job.id &&
        b.chatId === job.chatId &&
        (b.projectId === p.id || b.id === p.buildId) &&
        !refs0.some((r) => r.buildId === b.id),
    )
    .sort((a, b) => a.createdAt - b.createdAt);
  let v = Math.max(0, ...refs0.filter((r) => r.chatId === job.chatId).map((r) => r.version));
  const frozen: ProjectBuildRef[] = frozenJobs.map((b) => ({
    buildId: b.id,
    chatId: b.chatId,
    version: ++v,
    // The origin build and its project were written in the same call, so that
    // time is true; any other legacy join time was never recorded.
    savedAt: b.id === p.buildId ? p.createdAt : null,
  }));
  const builds: ProjectBuildRef[] = [
    ...refs0,
    ...frozen,
    { buildId: job.id, chatId: job.chatId, version: ++v, savedAt: now },
  ];

  // The builds of this lineage the project already held, newest first.
  const priorIds = new Set(
    builds.filter((r) => r.chatId === job.chatId && r.buildId !== job.id).map((r) => r.buildId),
  );
  const prior = lineage
    .filter((b) => priorIds.has(b.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  const incoming = productsOf(job).map((bp) => ({
    bp,
    name: modelNameOf(bp, job),
    description: modelDescOf(bp),
  }));
  // A hand-made project's virtual row "p1" becomes a stored row when it has a
  // name, or editor work under its id even without one (EDITOR §3.1) —
  // dropping it would orphan every `…:<id>:p1` document.
  const rows: ManualProduct[] = p.products?.length
    ? p.products
    : p.productName.trim() || p.editorOpened?.p1
      ? [{ id: "p1", name: p.productName, description: p.description }]
      : [];

  const used = new Set<string>();
  const take = (pred: (x: (typeof incoming)[number]) => boolean) => {
    const m = incoming.find((x) => !used.has(x.bp.id) && pred(x));
    if (m) used.add(m.bp.id);
    return m;
  };
  // The build product a row last came from, inside the earlier build that made
  // it: its stored source, else (a legacy row) the newest earlier build naming it.
  const earlier = (row: ManualProduct): { bp: BuildProduct; j: BuildJob } | null => {
    const src = row.source;
    if (src) {
      const j = prior.find((b) => b.id === src.buildId);
      const bp = j ? productsOf(j).find((x) => x.id === src.productId) : undefined;
      return j && bp ? { bp, j } : null;
    }
    for (const j of prior) {
      const bp = productsOf(j).find((x) => norm(modelNameOf(x, j)) === norm(row.name));
      if (bp) return { bp, j };
    }
    return null;
  };

  const next: ManualProduct[] = [];
  const dropped = new Set<string>();
  for (const row of rows) {
    const inLineage = row.source ? priorIds.has(row.source.buildId) : earlier(row) !== null;
    if (!inLineage) {
      // Another lineage's product, or a hand-made one. A sourceless row named
      // like one of this build's products adopts it — only while this chat
      // has no earlier version here, so a rebuild never steals a row.
      const m =
        !row.source && priorIds.size === 0
          ? take((x) => norm(x.name) === norm(row.name))
          : undefined;
      next.push(m ? { ...row, source: { buildId: job.id, productId: m.bp.id }, updatedAt: now } : row);
      continue;
    }
    // Same lineage: this version replaces the row — by product id, then name.
    // A legacy row has no stored id, so it goes by the product it was in the
    // earlier build: a rebuild that renames the primary still replaces its row.
    const m =
      take((x) => x.bp.id === (row.source?.productId ?? earlier(row)?.bp.id)) ??
      take((x) => norm(x.name) === norm(row.name));
    if (!m) {
      // Not in this version: it stays listed, its source still the last
      // version that had it (COR-108).
      dropped.add(row.id);
      next.push(row);
      continue;
    }
    // Keep the maker's own words; take the model's new words only where the
    // row still holds the previous version's.
    const before = earlier(row);
    const keepName = !before || row.name !== modelNameOf(before.bp, before.j);
    const keepDesc = !before || row.description !== modelDescOf(before.bp);
    next.push({
      ...row,
      name: keepName ? row.name : m.name,
      description: keepDesc ? row.description : m.description,
      source: { buildId: job.id, productId: m.bp.id },
      updatedAt: now,
    });
  }
  // A new row's id is never one the project already holds.
  const taken = new Set(rows.map((r) => r.id));
  for (const x of incoming) {
    if (used.has(x.bp.id)) continue;
    let id = newProductId();
    while (taken.has(id)) id = newProductId();
    taken.add(id);
    next.push({
      id,
      name: x.name,
      description: x.description,
      source: { buildId: job.id, productId: x.bp.id },
      updatedAt: now,
    });
  }

  // The headline follows the current version, and is never a dropped row: a
  // headline this version left out hands the name to the first row still in.
  const headMoved = !p.productName.trim() || p.productName === rows[0]?.name;
  const head = next.find((r) => !dropped.has(r.id)) ?? next[0];
  return {
    ...p,
    builds,
    products: next,
    ...(headMoved && head ? { productName: head.name } : null),
    // Only the project this build CREATES records it as its origin; a join
    // never stamps it.
    ...(opts.origin && !p.buildId ? { buildId: job.id } : null),
    updatedAt: now,
  };
}

/**
 * Where Save puts a build (§5.1.8 steps 1, 3 and 4), read from the list alone:
 * the live project the build is already in — returned as it is; else the live
 * project another build of its chat was saved into, which this build joins as
 * the next version (COR-89); else the live project the maker chose at the setup
 * question. Null: nothing to join, so a new project is made. The provider's
 * in-session guard (step 2) sits between the first answer and the other two.
 */
export function saveTargetOf(
  job: BuildJob,
  lineage: BuildJob[],
  projects: ManualProject[],
): { project: ManualProject; via: "saved" | "lineage" | "chosen" } | null {
  const live = (id: string | undefined) =>
    id ? (projects.find((p) => p.id === id) ?? null) : null;
  const saved = live(job.projectId);
  if (saved) return { project: saved, via: "saved" };
  const sibling = lineageProjectOf(job, lineage, projects);
  if (sibling) return { project: sibling, via: "lineage" };
  const chosen = live(job.projectChoiceId);
  return chosen ? { project: chosen, via: "chosen" } : null;
}

/** What the save step (P2-SAVE-2…6) hands Save: the new project's words, or
 *  the project a join or a version goes into. */
export type SaveInput =
  | { kind: "new"; name: string; description: string; cover: ProductSource | null }
  | { kind: "join"; projectId: string }
  | { kind: "version"; projectId: string };

// The live project that already holds this build: job.projectId, else one whose
// origin or builds[] names it (a save whose builds-store write failed, P2-SAVE-15).
// save-step.ts's holderOf() answers the same question for the dialog.
function holderIn(job: BuildJob, projects: readonly ManualProject[]): ManualProject | null {
  return (
    (job.projectId ? projects.find((p) => p.id === job.projectId) : undefined) ??
    projects.find((p) => p.buildId === job.id || (p.builds ?? []).some((r) => r.buildId === job.id)) ??
    null
  );
}

/**
 * The one record Save writes (P2-SAVE-3/5/6/15) — the pure core of the
 * provider's `saveBuild`. `before` is the stored record it replaces, null for
 * a new one.
 * - `new`: the record `createProject` builds, under `ids`, then
 *   `attach(…, { origin: true })`. `cover` is written only when the maker
 *   picked an image other than this build's primary — the primary is the
 *   default cover already.
 * - `join` / `version`: `attach(target, job, lineage, now)`.
 * - A build a live project already holds comes back as that project, with
 *   `next === before`: nothing to write, and never a twin.
 * Null when a join or version target isn't in `projects` any more (another
 * tab deleted it): the dialog says so and switches to new mode (P2-SAVE-15).
 */
export function saveRecord(
  input: SaveInput,
  job: BuildJob,
  lineage: BuildJob[],
  projects: readonly ManualProject[],
  now: number,
  ids: { id: string; slug: string },
): { next: ManualProject; before: ManualProject | null } | null {
  const holder = holderIn(job, projects);
  if (holder) return { next: holder, before: holder };
  if (input.kind === "new") {
    const created: ManualProject = {
      id: ids.id,
      slug: ids.slug,
      name: input.name.trim(),
      productName: "",
      description: input.description.trim(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
      flowState: { ...EMPTY_FLOW_STATE },
    };
    const next = attach(created, job, [], now, { origin: true });
    const c = input.cover;
    const cover = c && !(c.buildId === job.id && c.productId === "primary") ? c : null;
    return {
      next: cover ? { ...next, cover: { buildId: cover.buildId, productId: cover.productId } } : next,
      before: null,
    };
  }
  const target = projects.find((p) => p.id === input.projectId);
  if (!target) return null;
  return { next: attach(target, job, lineage, now), before: target };
}

/** Words for one product, typed in the Brief's Step 1. `rowId` ties it to a
 *  row outright; without one it is matched by position or name. */
export type ProductEdit = { name: string; description: string; rowId?: string };

/**
 * Step 1's words laid over a project's rows (§5.1.7, "Brief text edits"). An
 * edit that names its row goes there; the rest go by position when the two
 * lists are the same length, else by normalized name. Each row keeps its id and
 * source, a row whose text really changed is stamped `updatedAt`, and no row is
 * ever added or dropped — attach() decides the rows, the Brief only words them.
 * An empty name keeps the row's own: a product always has one.
 */
export function mergeProductEdits(
  prev: ManualProduct[],
  edits: ProductEdit[],
  now: number,
): ManualProduct[] {
  const byRow = new Map<number, ProductEdit>();
  const placed = new Set<number>();
  const place = (row: number, edit: number) => {
    byRow.set(row, edits[edit]);
    placed.add(edit);
  };
  edits.forEach((e, j) => {
    if (!e.rowId) return;
    const i = prev.findIndex((r) => r.id === e.rowId);
    if (i >= 0 && !byRow.has(i)) place(i, j);
  });
  const loose = edits.flatMap((e, j) => (e.rowId ? [] : [j]));
  if (edits.length === prev.length) {
    for (const j of loose) if (!byRow.has(j)) place(j, j);
  }
  for (const j of loose) {
    if (placed.has(j)) continue;
    const i = prev.findIndex((r, n) => !byRow.has(n) && norm(r.name) === norm(edits[j].name));
    if (i >= 0) place(i, j);
  }
  return prev.map((row, i) => {
    const e = byRow.get(i);
    if (!e) return row;
    const name = e.name.trim() || row.name;
    const description = e.description.trim();
    return name === row.name && description === row.description
      ? row
      : { ...row, name, description, updatedAt: now };
  });
}

/** The editor chrome's headline rename (COR-95): the new `productName`, and
 *  the first product renamed with it while that row still carried the old
 *  headline — they are one product, so the list must not go on calling it by
 *  its old name. An empty name clears the headline ("Untitled product") and
 *  leaves the row named. */
export function renameHeadline(
  p: ManualProject,
  name: string,
  now: number,
): Pick<ManualProject, "productName"> & Partial<Pick<ManualProject, "products">> {
  const clean = name.trim();
  const first = p.products?.[0];
  if (!p.products || !first || !clean || first.name !== p.productName || first.name === clean)
    return { productName: clean };
  return {
    productName: clean,
    products: [{ ...first, name: clean, updatedAt: now }, ...p.products.slice(1)],
  };
}

/** A patch laid over a stored record, as `updateProject` writes it: product
 *  rows keep their identity (keepProductIds), and `updatedAt` is `now`. */
export function applyPatch(p: ManualProject, patch: ProjectPatch, now: number): ManualProject {
  const { products, ...rest } = patch;
  return {
    ...p,
    ...rest,
    ...(products ? { products: keepProductIds(products, heldProducts(p)) } : null),
    updatedAt: now,
  };
}

// ─────────────── The contributor writers' pure core (P2-CONTRIB-5/6) ───────────────

/** What the Contributor dialog hands a writer, after `checkContributor`. */
export type ContributorValue = Pick<Contributor, "name" | "role" | "share">;
/** Why a writer refused. `over100`: the co-owners plus the sold shares would
 *  pass 100 % (the ownership invariant), or — once a Main share has sold —
 *  reach it, leaving the maker nothing (R2-5). */
export type ContributorRefusal = "missing" | "invalid" | "duplicate" | "full" | "over100";
export type ContributorWrite =
  | { ok: true; project: ManualProject; contributor: Contributor }
  | { ok: false; reason: ContributorRefusal };
/** `soldPct`: the Main shares already sold (Σ `sharePct`, from the market
 *  store the provider can't read). `id`: the new contributor's id, so the
 *  provider can apply one add twice and get one row. */
export type ContributorOpts = { soldPct?: number; id?: string };

const ROLES: readonly ContributorRole[] = ["viewer", "editor", "coOwner"];

// The stored form of a value, or null when it can't be stored: a trimmed
// 1–60-character name, a known role, and a whole 1–100 share for a co-owner —
// 0 for everyone else, whatever was passed.
function contributorValueOf(v: ContributorValue): ContributorValue | null {
  const name = typeof v?.name === "string" ? v.name.trim() : "";
  if (!name || Array.from(name).length > CONTRIBUTOR_NAME_MAX) return null;
  if (!ROLES.includes(v.role)) return null;
  if (v.role !== "coOwner") return { name, role: v.role, share: 0 };
  return Number.isInteger(v.share) && v.share >= 1 && v.share <= 100
    ? { name, role: "coOwner", share: v.share }
    : null;
}

const sameName = (a: string, b: string) => norm(a) === norm(b);
const coOwnedPct = (list: readonly Contributor[]) =>
  list.reduce((sum, c) => sum + (c.role === "coOwner" ? c.share : 0), 0);

// The invariant (P2-CONTRIB-5): every co-owner share plus every sold share is
// 100 or less. A write that breaks it is refused — unless the record was
// already past 100 (a hand-edited one) and this write doesn't raise it, so the
// maker can still fix such a record one row at a time. Once a Main share has
// sold, a write that raises the co-owners to leave the maker 0 % is refused
// too: that would lock the project (decision 12), and nobody could undo it (R2-5).
function breaksInvariant(
  before: readonly Contributor[],
  after: readonly Contributor[],
  soldPct: number | undefined,
): boolean {
  const sold = soldPct !== undefined && Number.isFinite(soldPct) ? Math.max(0, soldPct) : 0;
  const total = coOwnedPct(after) + sold;
  if (total > 100 && total > coOwnedPct(before) + sold) return true;
  return sold > 0 && total >= 100 && coOwnedPct(after) > coOwnedPct(before);
}

/** Adds a contributor (P2-CONTRIB-6). Refuses an invalid value, a name already
 *  on the project, a 51st row and a total past 100. Bumps `updatedAt`. */
export function addContributorTo(
  p: ManualProject,
  value: ContributorValue,
  now: number,
  opts: ContributorOpts = {},
): ContributorWrite {
  const clean = contributorValueOf(value);
  if (!clean) return { ok: false, reason: "invalid" };
  const list = p.contributors ?? [];
  if (list.length >= CONTRIBUTORS_MAX) return { ok: false, reason: "full" };
  if (list.some((c) => sameName(c.name, clean.name))) return { ok: false, reason: "duplicate" };
  const free = (id: string | undefined): id is string => !!id && !list.some((c) => c.id === id);
  let id = free(opts.id) ? opts.id : newContributorId();
  while (!free(id)) id = newContributorId();
  const contributor: Contributor = { id, ...clean, addedAt: now };
  const next = [...list, contributor];
  if (breaksInvariant(list, next, opts.soldPct)) return { ok: false, reason: "over100" };
  return { ok: true, project: { ...p, contributors: next, updatedAt: now }, contributor };
}

/** Edits one contributor: its name, role and share. Leaving Co-owner gives the
 *  share back (it becomes 0). The same refusals as an add, minus `full`. */
export function updateContributorIn(
  p: ManualProject,
  contributorId: string,
  value: ContributorValue,
  now: number,
  opts: Pick<ContributorOpts, "soldPct"> = {},
): ContributorWrite {
  const list = p.contributors ?? [];
  if (!list.some((c) => c.id === contributorId)) return { ok: false, reason: "missing" };
  const clean = contributorValueOf(value);
  if (!clean) return { ok: false, reason: "invalid" };
  if (list.some((c) => c.id !== contributorId && sameName(c.name, clean.name)))
    return { ok: false, reason: "duplicate" };
  const next = withContributor(list, clean, now, contributorId);
  if (breaksInvariant(list, next, opts.soldPct)) return { ok: false, reason: "over100" };
  const contributor = next.find((c) => c.id === contributorId) as Contributor;
  return { ok: true, project: { ...p, contributors: next, updatedAt: now }, contributor };
}

/** Removes one contributor; a co-owner's share comes back to the maker. The
 *  answer carries the row as it was, for "… removed — their 30% came back". */
export function removeContributorFrom(
  p: ManualProject,
  contributorId: string,
  now: number,
): ContributorWrite {
  const list = p.contributors ?? [];
  const contributor = list.find((c) => c.id === contributorId);
  if (!contributor) return { ok: false, reason: "missing" };
  return {
    ok: true,
    project: { ...p, contributors: withoutContributor(list, contributorId), updatedAt: now },
    contributor,
  };
}

/** Every product row id a project's browser keys can be under, for the delete
 *  sweep: its rows (a dropped row stays listed, O9), every row it stamped in
 *  the editor, and the virtual "p1" — a hand project's `:p1` documents
 *  outlive the row when a build joined before the p1 rule kept it. */
export function sweepRowIdsOf(p: ManualProject): string[] {
  const ids = new Set<string>(heldProducts(p).map((r) => r.id));
  for (const id of Object.keys(p.editorOpened ?? {})) ids.add(id);
  if (p.lastOpened?.productId) ids.add(p.lastOpened.productId);
  ids.add("p1");
  return [...ids];
}

type Ctx = {
  hydrated: boolean;
  projects: ManualProject[];
  activeProjectId: string | null;
  activeProject: ManualProject | null;
  findBySlug: (slug: string) => ManualProject | null;
  // Mutations
  // Makes the record. Which project the editor is working on is a separate,
  // deliberate act (`selectProject`, or landing on /project/<slug>/…) — a
  // create that also switched the active project moved every editor route
  // out from under the user as a side effect of saving something.
  createProject: (input: { name: string; description: string }) => ManualProject;
  /** Save (P2-SAVE-15): `saveRecord` applied in ONE setProjects write.
   *  `revert` puts the list back as it was — removes a new record, or
   *  restores `before` — and drops the in-session builtFrom entry, for when
   *  the browser refuses the write (`projectWriteRefused`). A build already
   *  saved (in a live project, or earlier this session) comes back as that
   *  project with a no-op `revert`. Null when a join or version target is
   *  gone. `lineage` = the OTHER builds of job.chatId. */
  saveBuild: (
    job: BuildJob,
    lineage: BuildJob[],
    input: SaveInput,
  ) => { project: ManualProject; revert: () => void } | null;
  // A build joins a project (COR-88): attach() on the stored record,
  // idempotent by build id — the one writer Save, Open in editor and the
  // Brief's Step 1 share. `origin` only for the project this build creates.
  // Null when there is no such project.
  attachBuild: (
    projectId: string,
    job: BuildJob,
    lineage?: BuildJob[],
    opts?: { origin?: boolean },
  ) => ManualProject | null;
  selectProject: (id: string) => void;
  updateProject: (id: string, patch: ProjectPatch) => void;
  // "Use as cover" / "Stop using as cover" (CNT-15): a product source, or
  // null to go back to coverOf()'s default. Bumps updatedAt.
  setCover: (id: string, cover: ProductSource | null) => void;
  /** Showcase's one control (COM-55, COR-105): on writes `at` — the Brief's
   *  commit passes its mint time, so the two are one moment — else
   *  Date.now(); off writes null. Through updateProject, so it bumps
   *  updatedAt like any other maker's edit — unlike backfillShowcase, which
   *  records an old fact rather than one made now. */
  setShowcase: (id: string, on: boolean, at?: number) => void;
  markStepCompleted: (id: string, step: keyof ManualFlowState) => void;
  setStatus: (id: string, status: ManualProjectStatus) => void;
  /** COR-105's one-time backfill: a project minted with Share to Innovations
   *  before Showcase shipped gets `showcasedAt = at` — only while it has none
   *  recorded (absent), so a `null` "stopped showcasing" is never overwritten.
   *  Never bumps `updatedAt`: it records an old fact, not a change the maker
   *  made. Called with `showcaseBackfillOf()`'s answer (lib/brief/project-brief). */
  backfillShowcase: (id: string, at: number) => void;
  clearActive: () => void;
  /** P2-EDITOR-1: the product the editor is working on — the active project
   *  (as `selectProject`) plus `activeProductId`. In memory only; the URL and
   *  `lastOpened` carry the resume. */
  selectEditorScope: (projectId: string, productId: string) => void;
  /** The editor's product row in the active project, or null (no scope, or
   *  a scope for another project or a row it doesn't hold). */
  activeProductId: string | null;
  /** P2-EDITOR-7 (COR-91): stamps where product `productId` was left —
   *  `editorOpened[productId]` and `lastOpened`. Never bumps updatedAt; at
   *  most one write per (product, step) per minute; a row the project doesn't
   *  hold is ignored. */
  touchOpened: (id: string, productId: string, step: EditorStep) => void;
  /** P2-EDITOR-6: renames one row (`editor-scope.ts`'s renameProduct — the
   *  virtual "p1" writes productName; the first row carries the headline
   *  while they agree). False, and no write, for an empty name or an unknown
   *  row. Bumps updatedAt. */
  renameProduct: (id: string, rowId: string, name: string) => boolean;
  /** P2-MINT-8: the demo mint record — only the mint and listing commits call
   *  this. Stored as normalizeMintRecord reads it; false, and no write, for a
   *  record that doesn't parse or a project that isn't here. Bumps updatedAt. */
  setMint: (id: string, record: MintRecord) => boolean;
  /** P2-CONTRIB-6. Each re-checks the value and the ownership invariant —
   *  co-owners plus `soldPct` (the Main shares sold) at most 100 — and
   *  refuses with a reason instead of writing. Each bumps updatedAt. */
  addContributor: (projectId: string, value: ContributorValue, opts?: { soldPct?: number }) => ContributorWrite;
  updateContributor: (
    projectId: string,
    contributorId: string,
    value: ContributorValue,
    opts?: { soldPct?: number },
  ) => ContributorWrite;
  removeContributor: (projectId: string, contributorId: string) => ContributorWrite;
  /** VIDEO: "I confirm I am the rightful owner of this idea" ticked at `at`. Bumps updatedAt. */
  setOwnerConfirmed: (id: string, at: number) => void;
  /** P2-TABS-23: the Legal block's details, through normalizeLegal — an
   *  all-empty one (or null) clears them. Bumps updatedAt. */
  setLegal: (id: string, legal: ProjectLegal | null) => void;
  /** P2-TABS-22: the description coachmark's "Not now". A dismissal, not an
   *  edit, so it never bumps updatedAt. */
  setDescriptionHint: (id: string, hint: DescriptionHint) => void;
  /** COR-93: the newest browser write that failed and hasn't saved since,
   *  from this store or the create-history store; null when all went through. */
  writeError: WriteError | null;
  /** COR-92: removes the record and everything the project keeps in this
   *  browser (§5.1.9): sweeps `projectStorageKeys(id, rowIds)`, removes the
   *  network, then dispatches `ideeza:project-deleted` so the market, video
   *  and journey stores purge their own records. Callers check
   *  deleteBlockOf() first (COR-70). */
  deleteProject: (id: string) => void;
};

const ManualProjectsContext = React.createContext<Ctx | null>(null);

export function ManualProjectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projects, setProjects] = React.useState<ManualProject[]>([]);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(
    null,
  );
  const [hydrated, setHydrated] = React.useState(false);
  // The editor's product (P2-EDITOR-1). In memory only.
  const [scope, setScope] = React.useState<EditorScope | null>(null);
  // Projects made or joined from an AI build in this session, by build id —
  // see saveBuild.
  const builtFrom = React.useRef(new Map<string, ManualProject>());
  const writeError = React.useSyncExternalStore(
    subscribeWriteError,
    currentWriteError,
    NO_WRITE_ERROR,
  );
  // Projects created in the current event, by id, until `projects` holds them:
  // the Brief creates a project and attaches its build in one press, and
  // `projects` is still the list from before the create.
  const made = React.useRef(new Map<string, ManualProject>());

  React.useEffect(() => {
    const stored = normalizeProjects(loadJSON<unknown>(PROJECTS_KEY, []));
    // Reading localStorage in the state initialiser would render different
    // markup on the server and the client — so the store hydrates here, once,
    // after mount, on purpose.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(stored);
    const active = loadActiveId();
    // Don't carry a stale id forward — clear if the project no longer
    // exists in storage (e.g. user cleared their localStorage selectively).
    if (active && stored.find((p) => p.id === active)) {
      setActiveProjectId(active);
    } else {
      saveActiveId(null);
      setActiveProjectId(null);
    }
    setHydrated(true);
  }, []);

  // A write the browser refuses is reported, so the page can say so (COR-93).
  React.useEffect(() => {
    if (!hydrated) return;
    reportWrite(PROJECTS_KEY, saveJSON(PROJECTS_KEY, projects));
  }, [projects, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    reportWrite(ACTIVE_KEY, saveActiveId(activeProjectId));
  }, [activeProjectId, hydrated]);
  // Once a render holds them, the projects made above are read from `projects`.
  React.useEffect(() => {
    made.current.clear();
  }, [projects]);

  const createProject = React.useCallback(
    (input: { name: string; description: string }) => {
      const now = Date.now();
      const project: ManualProject = {
        id: makeId(),
        slug: uniqueSlug(input.name, projects),
        name: input.name.trim(),
        productName: "",
        description: input.description.trim(),
        status: "draft",
        createdAt: now,
        updatedAt: now,
        flowState: { ...EMPTY_FLOW_STATE },
      };
      made.current.set(project.id, project);
      setProjects((arr) => [project, ...arr]);
      return project;
    },
    [projects],
  );

  const selectProject = React.useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  // A patch's product rows keep their identity: a row written without an id
  // (the Brief's Step 1 writes `{ name, description }`) takes the id of the
  // row it replaces — see keepProductIds.
  const updateProject = React.useCallback(
    (id: string, patch: ProjectPatch) => {
      const now = Date.now();
      setProjects((arr) => arr.map((p) => (p.id === id ? applyPatch(p, patch, now) : p)));
    },
    [],
  );

  // The record as this event sees it: the rendered list, else one created
  // earlier in the same event and not rendered yet.
  const recordOf = React.useCallback(
    (id: string) => projects.find((p) => p.id === id) ?? made.current.get(id) ?? null,
    [projects],
  );

  // The same write as a rename — through updateProject, so it bumps updatedAt.
  const setCover = React.useCallback(
    (id: string, cover: ProductSource | null) => updateProject(id, { cover }),
    [updateProject],
  );

  // Showcase's one control: on is the time handed in, else now; off is null (COM-55).
  const setShowcase = React.useCallback(
    (id: string, on: boolean, at?: number) =>
      updateProject(id, { showcasedAt: on ? (at ?? Date.now()) : null }),
    [updateProject],
  );

  // A build joins a project — attach() on the record as it stands, written
  // back to the list. Idempotent by build id: a build already in the project
  // hands the record back unchanged and writes nothing.
  const attachBuild = React.useCallback(
    (
      projectId: string,
      job: BuildJob,
      lineage: BuildJob[] = [],
      opts: { origin?: boolean } = {},
    ): ManualProject | null => {
      const base =
        projects.find((p) => p.id === projectId) ?? made.current.get(projectId);
      if (!base) return null;
      const now = Date.now();
      const next = attach(base, job, lineage, now, opts);
      if (next === base) return base;
      // The record this computed is the one stored, product ids and all. Only a
      // record another write in this same event already changed is merged
      // again, onto that newer copy.
      setProjects((arr) =>
        arr.map((p) =>
          p.id !== projectId
            ? p
            : p === base
              ? next
              : attach(p, job, lineage, now, opts),
        ),
      );
      return next;
    },
    [projects],
  );

  // Save (P2-SAVE-15): saveRecord on the list as this event sees it, in one
  // setProjects write. Making the record is all this does — the caller
  // decides whether the editor should switch to it, and calls setBuildProject
  // only once the write has settled.
  const saveBuild = React.useCallback(
    (
      job: BuildJob,
      lineage: BuildJob[],
      input: SaveInput,
    ): { project: ManualProject; revert: () => void } | null => {
      const noop = () => {};
      // `projects` is React state, so two presses inside one tick would both
      // read the list from before the first one and attach — or create —
      // twice. This is what keeps one build to one project.
      const already = builtFrom.current.get(job.id);
      if (already) return { project: already, revert: noop };
      const unrendered = [...made.current.values()].filter(
        (m) => !projects.some((p) => p.id === m.id),
      );
      const list = unrendered.length ? [...unrendered, ...projects] : projects;
      const now = Date.now();
      const name = input.kind === "new" ? input.name.trim() : "";
      const result = saveRecord(input, job, lineage, list, now, {
        id: makeId(),
        slug: uniqueSlug(name, list),
      });
      if (!result) return null;
      const { next, before } = result;
      if (next === before) return { project: next, revert: noop };
      if (before === null) {
        made.current.set(next.id, next);
        setProjects((arr) => [next, ...arr]);
      } else {
        // The record computed is the one stored. Only a record another write
        // in this same event already changed is attached again, onto that
        // newer copy.
        setProjects((arr) =>
          arr.map((p) =>
            p.id !== next.id ? p : p === before ? next : attach(p, job, lineage, now),
          ),
        );
      }
      builtFrom.current.set(job.id, next);
      const revert = () => {
        if (builtFrom.current.get(job.id) === next) builtFrom.current.delete(job.id);
        if (before === null) {
          made.current.delete(next.id);
          setProjects((arr) => arr.filter((p) => p.id !== next.id));
        } else {
          setProjects((arr) => arr.map((p) => (p.id === before.id ? before : p)));
        }
      };
      return { project: next, revert };
    },
    [projects],
  );

  const markStepCompleted = React.useCallback(
    (id: string, step: keyof ManualFlowState) => {
      setProjects((arr) =>
        arr.map((p) =>
          p.id === id
            ? {
                ...p,
                updatedAt: Date.now(),
                flowState: { ...p.flowState, [step]: true },
              }
            : p,
        ),
      );
    },
    [],
  );

  const setStatus = React.useCallback(
    (id: string, status: ManualProjectStatus) => {
      setProjects((arr) =>
        arr.map((p) =>
          p.id === id ? { ...p, status, updatedAt: Date.now() } : p,
        ),
      );
    },
    [],
  );

  const backfillShowcase = React.useCallback((id: string, at: number) => {
    if (!Number.isFinite(at)) return;
    setProjects((arr) => {
      const i = arr.findIndex((p) => p.id === id && p.showcasedAt === undefined);
      if (i < 0) return arr; // already recorded, either way: nothing to write, no save
      const next = arr.slice();
      next[i] = { ...arr[i], showcasedAt: at };
      return next;
    });
  }, []);

  const clearActive = React.useCallback(() => {
    setActiveProjectId(null);
    setScope(null);
  }, []);

  // P2-EDITOR-1 — the editor opens a product: the project becomes the active
  // one, and the row is held beside it.
  const selectEditorScope = React.useCallback((projectId: string, productId: string) => {
    setActiveProjectId(projectId);
    setScope((cur) =>
      cur && cur.projectId === projectId && cur.productId === productId
        ? cur
        : { projectId, productId },
    );
  }, []);

  // P2-EDITOR-7 (COR-91) — where each product was left, the one resume
  // signal. Opening a step changes nothing in the project, so updatedAt stays;
  // a (product, step) already stamped in the last minute isn't written again.
  // The Brief is the project's, not a product step, so it never stamps.
  const touchOpened = React.useCallback((id: string, productId: string, step: EditorStep) => {
    if ((step as ProjectStep) === "brief") return;
    const now = Date.now();
    setProjects((arr) => {
      const i = arr.findIndex((p) => p.id === id);
      if (i < 0 || !heldProducts(arr[i]).some((r) => r.id === productId)) return arr;
      const next = stampEditorOpened(arr[i], productId, step, now);
      if (next === arr[i]) return arr;
      const out = arr.slice();
      out[i] = next;
      return out;
    });
  }, []);

  // P2-EDITOR-6 — the pure rename, applied to the record as it stands when the
  // write lands, so a write earlier in the same event isn't overwritten.
  const renameProduct = React.useCallback(
    (id: string, rowId: string, name: string) => {
      const base = recordOf(id);
      const now = Date.now();
      if (!base || !Object.keys(renameProductPatch(base, rowId, name, now)).length) return false;
      setProjects((arr) =>
        arr.map((p) => {
          if (p.id !== id) return p;
          const patch = renameProductPatch(p, rowId, name, now);
          return Object.keys(patch).length ? applyPatch(p, patch, now) : p;
        }),
      );
      return true;
    },
    [recordOf],
  );

  // P2-MINT-8 — the mint record, stored exactly as a reload will read it.
  const setMint = React.useCallback(
    (id: string, record: MintRecord) => {
      const clean = normalizeMintRecord(record);
      if (!clean || !recordOf(id)) return false;
      const now = Date.now();
      setProjects((arr) =>
        arr.map((p) => (p.id === id ? { ...p, mint: clean, updatedAt: now } : p)),
      );
      return true;
    },
    [recordOf],
  );

  // P2-CONTRIB-6 — one contributor write: computed on the record this event
  // sees, so the caller learns at once whether it was refused and which row
  // it wrote; applied again only onto a copy another write already changed.
  const contributorWrite = React.useCallback(
    (projectId: string, run: (p: ManualProject, now: number) => ContributorWrite): ContributorWrite => {
      const base = recordOf(projectId);
      if (!base) return { ok: false, reason: "missing" };
      const now = Date.now();
      const result = run(base, now);
      if (!result.ok) return result;
      setProjects((arr) =>
        arr.map((p) => {
          if (p.id !== projectId) return p;
          if (p === base) return result.project;
          const again = run(p, now);
          return again.ok ? again.project : p;
        }),
      );
      return result;
    },
    [recordOf],
  );
  const addContributor = React.useCallback(
    (projectId: string, value: ContributorValue, opts: { soldPct?: number } = {}) => {
      const id = newContributorId();
      return contributorWrite(projectId, (p, now) =>
        addContributorTo(p, value, now, { soldPct: opts.soldPct, id }),
      );
    },
    [contributorWrite],
  );
  const updateContributor = React.useCallback(
    (projectId: string, contributorId: string, value: ContributorValue, opts: { soldPct?: number } = {}) =>
      contributorWrite(projectId, (p, now) =>
        updateContributorIn(p, contributorId, value, now, { soldPct: opts.soldPct }),
      ),
    [contributorWrite],
  );
  const removeContributor = React.useCallback(
    (projectId: string, contributorId: string) =>
      contributorWrite(projectId, (p, now) => removeContributorFrom(p, contributorId, now)),
    [contributorWrite],
  );

  // VIDEO — the owner's confirmation, a maker's act like Showcase.
  const setOwnerConfirmed = React.useCallback(
    (id: string, at: number) => {
      if (!isTime(at)) return;
      updateProject(id, { ownerConfirmedAt: at });
    },
    [updateProject],
  );

  // P2-TABS-23 — what normalizeLegal keeps; nothing left clears the block.
  // Saving the details as they already are (its own time aside) writes nothing.
  const setLegal = React.useCallback((id: string, legal: ProjectLegal | null) => {
    const clean = legal === null ? undefined : normalizeLegal(legal);
    const bare = (l: ProjectLegal | undefined) => (l ? { ...l, updatedAt: 0 } : undefined);
    const now = Date.now();
    setProjects((arr) =>
      arr.map((p) => {
        if (p.id !== id || sameJson(bare(p.legal), bare(clean))) return p;
        const next: ManualProject = { ...p, updatedAt: now };
        if (clean) next.legal = clean;
        else delete next.legal;
        return next;
      }),
    );
  }, []);

  // P2-TABS-22 — "Not now" on the coachmark: a dismissal, so updatedAt stays,
  // and the same dismissal again writes nothing.
  const setDescriptionHint = React.useCallback((id: string, hint: DescriptionHint) => {
    const clean = descriptionHintIn(hint);
    if (!clean) return;
    setProjects((arr) => {
      const i = arr.findIndex((p) => p.id === id);
      if (i < 0 || sameJson(arr[i].descriptionHint, clean)) return arr;
      const out = arr.slice();
      out[i] = { ...arr[i], descriptionHint: { dismissedAt: clean.dismissedAt, productCount: clean.productCount } };
      return out;
    });
  }, []);

  // COR-92 — the record, the active selection, this session's build guard
  // and every key the project keeps in this browser (§5.1.9, P2 §3.4): the
  // exact per-product editor keys of every row it held, then the network, then
  // the `ideeza:project-deleted` event, on which the market, video and journey
  // stores purge their own records. Builds keep their now-dangling projectId,
  // so History drops the link and the build's review offers Save again (COR-71).
  const deleteProject = React.useCallback(
    (id: string) => {
      const record = recordOf(id);
      const rowIds = record ? sweepRowIdsOf(record) : ["p1"];
      setProjects((arr) => arr.filter((p) => p.id !== id));
      setActiveProjectId((cur) => (cur === id ? null : cur));
      setScope((cur) => (cur?.projectId === id ? null : cur));
      made.current.delete(id);
      for (const [buildId, held] of builtFrom.current) {
        if (held.id === id) builtFrom.current.delete(buildId);
      }
      if (typeof window === "undefined") return;
      // The root PcbProvider (v1, until P2-EDITOR-4) saves under
      // `ideeza:pcb:doc:<ideeza:manual:active>` when its debounce fires, so a
      // save already pending would re-create the swept document. Clearing the
      // stored active id now — not in the save effect after the next render —
      // sends that save to its "default" key instead.
      if (loadActiveId() === id) saveActiveId(null);
      try {
        sweepProjectKeys(id, rowIds, window.localStorage);
      } catch {
        // Storage itself is unreachable (blocked site data): nothing to sweep.
      }
      deleteNetwork(id);
      dispatchProjectDeleted(id);
    },
    [recordOf],
  );

  const activeProject =
    activeProjectId === null
      ? null
      : (projects.find((p) => p.id === activeProjectId) ?? null);
  const activeProductId =
    activeProject &&
    scope?.projectId === activeProject.id &&
    heldProducts(activeProject).some((r) => r.id === scope.productId)
      ? scope.productId
      : null;

  const findBySlug = React.useCallback(
    (slug: string) => projects.find((p) => p.slug === slug) ?? null,
    [projects],
  );

  const value: Ctx = {
    hydrated,
    projects,
    activeProjectId,
    activeProject,
    findBySlug,
    createProject,
    saveBuild,
    attachBuild,
    selectProject,
    updateProject,
    setCover,
    setShowcase,
    markStepCompleted,
    setStatus,
    backfillShowcase,
    clearActive,
    selectEditorScope,
    activeProductId,
    touchOpened,
    renameProduct,
    setMint,
    addContributor,
    updateContributor,
    removeContributor,
    setOwnerConfirmed,
    setLegal,
    setDescriptionHint,
    writeError,
    deleteProject,
  };

  return (
    <ManualProjectsContext.Provider value={value}>
      {children}
    </ManualProjectsContext.Provider>
  );
}

export function useManualProjects(): Ctx {
  const ctx = React.useContext(ManualProjectsContext);
  if (!ctx) {
    throw new Error(
      "useManualProjects must be used inside <ManualProjectsProvider>",
    );
  }
  return ctx;
}

// Derived helper — returns the first step not yet completed on a
// project, so "Resume" navigates the user where they actually left off.
// UIUX-80 — module order per client direction: PCB Design → Code → 3D Module →
// Assembly → Peripheral Wiring → Product Preview → Add Brief.
export const FLOW_STEPS: Array<keyof ManualFlowState> = [
  "pcb",
  "code",
  "three",
  "assembly",
  "wiring",
  "preview",
  "brief",
];

// URL segment per flow step. The 3D step lives at `/3d` for brevity while its
// state key is `three`.
export const STEP_URL_SEGMENT: Record<keyof ManualFlowState, string> = {
  pcb: "pcb",
  code: "code",
  three: "3d",
  assembly: "assembly",
  wiring: "wiring",
  preview: "preview",
  brief: "brief",
};

// Inverse: URL segment → flow step. Resolves `/project/<slug>/<segment>`.
export const SEGMENT_TO_STEP: Record<string, keyof ManualFlowState> = {
  pcb: "pcb",
  code: "code",
  "3d": "three",
  assembly: "assembly",
  wiring: "wiring",
  preview: "preview",
  brief: "brief",
};

// Build a project-scoped editor URL: /project/<slug>/<segment>. Accepts either
// a project or a bare slug.
export function stepHref(
  project: ManualProject | string,
  step: keyof ManualFlowState,
): string {
  const slug = typeof project === "string" ? project : project.slug;
  return `/project/${slug}/${STEP_URL_SEGMENT[step]}`;
}

export const STEP_LABELS: Record<keyof ManualFlowState, string> = {
  pcb: "PCB Design",
  code: "Code",
  three: "3D Module",
  assembly: "Assembly",
  wiring: "Peripheral Wiring",
  preview: "Product Preview",
  brief: "Brief",
};

export function firstIncompleteStep(project: ManualProject): keyof ManualFlowState {
  for (const s of FLOW_STEPS) {
    if (!project.flowState[s]) return s;
  }
  return "brief";
}

export function completedCount(project: ManualProject): number {
  return FLOW_STEPS.filter((s) => project.flowState[s]).length;
}

// Display label for the product being built. Empty → "Untitled product" so the
// editor chrome always shows something sensible before the user names it.
export function productLabel(project: ManualProject): string {
  return project.productName?.trim() || "Untitled product";
}
