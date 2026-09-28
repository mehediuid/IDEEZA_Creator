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
import type { BuildJob } from "../create/history";

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
  /** The editor step last opened. Open in editor's resume target — never a progress signal. */
  lastOpened?: { step: ProjectStep; at: number };
  /** Showcase (COR-105): a time = showcased since then; null = the maker stopped; absent = never recorded.
   *  A flag on the project, orthogonal to the outcome — never derived from the Brief's shareToNewsfeed. */
  showcasedAt?: number | null;
  /** The cover the maker chose ("Use as cover", CNT-15): the build product whose image is the project's
   *  cover, winning over coverOf()'s default (LST-34). null = the maker stopped using it, so the default
   *  applies again; absent = never chosen. A reference, never an image URL (§5.1.10). A later ProjectCover
   *  with a `kind` reads this shape as kind "concept" (§7 X10). */
  cover?: ProductSource | null;
};

/** What updateProject takes. Its product rows may come without ids (the Brief's Step 1 writes
 *  `{ name, description }`); keepProductIds gives each the id of the row it replaces. */
export type ProjectPatch = Partial<Omit<ManualProject, "id" | "products">> & {
  products?: ManualProductInput[];
};

export const PROJECT_NAME_MAX = 80; // CNT-2: trimmed, 1–80 characters
export const PROJECT_DESC_MAX = 1000; // CNT-5: trimmed, 0–1,000 characters…
export const PROJECT_DESC_COUNTER_FROM = 800; // …with a counter from 800

const PROJECTS_KEY = "ideeza:manual:projects";
const ACTIVE_KEY = "ideeza:manual:active";

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
function saveJSON<T>(key: string, v: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}
function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function saveActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_KEY);
    else window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

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

// Slug that doesn't collide with any existing project. Appends -2, -3, …
function uniqueSlug(name: string, existing: ManualProject[]): string {
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

// COR-91 — kept when its step is one of FLOW_STEPS and its time is finite.
function lastOpenedIn(raw: unknown): ManualProject["lastOpened"] {
  if (!isRecord(raw)) return undefined;
  const step = FLOW_STEPS.find((s) => s === raw.step);
  const at = raw.at;
  if (!step || !isTime(at)) return undefined;
  return Object.keys(raw).length === 2
    ? (raw as ManualProject["lastOpened"])
    : { step, at };
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

// Normalize projects loaded from storage: backfill slugs (unique within the
// batch), productName and every flow step for projects saved before those
// existed, and keep the fields added since — product ids, sources and times,
// build refs, lastOpened, showcasedAt, cover — dropping whatever doesn't parse
// (COR-87). Returns the same reference when nothing changed so React skips
// needless re-renders; a project that did change is written back by the save
// effect, so a legacy row gets its id exactly once.
export function normalizeProjects(list: unknown): ManualProject[] {
  if (!Array.isArray(list)) return [];
  const taken = new Set<string>();
  return list.filter(isRecord).map((raw) => {
    const p = raw as ManualProject;
    let slug = p.slug || slugify(p.name);
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);
    const products = productsIn(p.products);
    const builds = buildsIn(p.builds);
    const lastOpened = lastOpenedIn(p.lastOpened);
    const showcasedAt = showcasedIn(p.showcasedAt);
    const cover = coverIn(p.cover);
    // Backfill steps added after a project was saved (e.g. `assembly`,
    // UIUX-80) so flowState always carries every step key.
    const flowOk = p.flowState && FLOW_STEPS.every((s) => s in p.flowState);
    if (
      p.slug === slug &&
      p.productName !== undefined &&
      flowOk &&
      products === p.products &&
      builds === p.builds &&
      lastOpened === p.lastOpened &&
      showcasedAt === p.showcasedAt &&
      cover === p.cover
    )
      return p;
    const out: ManualProject = {
      ...p,
      slug,
      productName: p.productName ?? "",
      flowState: { ...EMPTY_FLOW_STATE, ...(p.flowState ?? {}) },
    };
    if (products) out.products = products;
    else delete out.products;
    if (builds) out.builds = builds;
    else delete out.builds;
    if (lastOpened) out.lastOpened = lastOpened;
    else delete out.lastOpened;
    if (showcasedAt !== undefined) out.showcasedAt = showcasedAt;
    else delete out.showcasedAt;
    if (cover !== undefined) out.cover = cover;
    else delete out.cover;
    return out;
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
  // The project a finished AI build becomes. One project per build: a
  // build that already carries a live `projectId` gets that project
  // back rather than a second copy of itself.
  projectFromBuild: (job: BuildJob) => ManualProject;
  selectProject: (id: string) => void;
  updateProject: (id: string, patch: ProjectPatch) => void;
  // "Use as cover" / "Stop using as cover" (CNT-15): a product source, or
  // null to go back to coverOf()'s default. Bumps updatedAt.
  setCover: (id: string, cover: ProductSource | null) => void;
  markStepCompleted: (id: string, step: keyof ManualFlowState) => void;
  setStatus: (id: string, status: ManualProjectStatus) => void;
  /** COR-105's one-time backfill: a project minted with Share to Innovations
   *  before Showcase shipped gets `showcasedAt = at` — only while it has none
   *  recorded (absent), so a `null` "stopped showcasing" is never overwritten.
   *  Never bumps `updatedAt`: it records an old fact, not a change the maker
   *  made. Called with `showcaseBackfillOf()`'s answer (lib/brief/project-brief). */
  backfillShowcase: (id: string, at: number) => void;
  clearActive: () => void;
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
  // Projects made from an AI build in this session, by build id — see
  // projectFromBuild.
  const builtFrom = React.useRef(new Map<string, ManualProject>());

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

  React.useEffect(() => {
    if (!hydrated) return;
    saveJSON(PROJECTS_KEY, projects);
  }, [projects, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    saveActiveId(activeProjectId);
  }, [activeProjectId, hydrated]);

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
      const { products, ...rest } = patch;
      setProjects((arr) =>
        arr.map((p) =>
          p.id === id
            ? {
                ...p,
                ...rest,
                ...(products
                  ? { products: keepProductIds(products, heldProducts(p)) }
                  : null),
                updatedAt: Date.now(),
              }
            : p,
        ),
      );
    },
    [],
  );

  // The same write as a rename — through updateProject, so it bumps updatedAt.
  const setCover = React.useCallback(
    (id: string, cover: ProductSource | null) => updateProject(id, { cover }),
    [updateProject],
  );

  // The project a finished build becomes — the one the maker already chose.
  // The setup question asked it before anything was drawn: an existing
  // project for a single product, or a name for the new one every system
  // gets. Save honours that answer instead of inventing a project from the
  // build's title, and it records every product the build made with the
  // sentence the model wrote for it, which is what the Brief and My projects
  // read. One project per build: a build that already has one gets it back.
  // Making the record is all this does — the caller decides whether the
  // editor should switch to it.
  const projectFromBuild = React.useCallback(
    (job: BuildJob) => {
      const existing = job.projectId
        ? projects.find((p) => p.id === job.projectId)
        : undefined;
      if (existing) return existing;
      // `projects` is React state, so two presses inside one tick would
      // both read the list from before the first one and make the build
      // two projects. This is what keeps one build to one project.
      const already = builtFrom.current.get(job.id);
      if (already) return already;

      const built: ManualProduct[] = [
        {
          id: newProductId(),
          name: job.title,
          description: (job.description || job.summary || "").trim(),
        },
        ...(job.companions ?? []).map((c) => ({
          id: newProductId(),
          name: (c.name || c.title).trim(),
          description: (c.description || c.summary || "").trim(),
        })),
      ];

      const chosen = job.projectChoiceId
        ? projects.find((p) => p.id === job.projectChoiceId)
        : undefined;
      if (chosen) {
        // Joining a project that already exists: its headline stays its own,
        // and this build's products are added to what it already holds.
        const held: ManualProduct[] =
          chosen.products ??
          (chosen.productName.trim()
            ? [{ id: "p1", name: chosen.productName, description: chosen.description }]
            : []);
        const names = new Set(held.map((x) => x.name.trim().toLowerCase()));
        const products = [
          ...held,
          ...built.filter((x) => !names.has(x.name.trim().toLowerCase())),
        ];
        const patch = {
          products,
          ...(chosen.productName.trim() ? null : { productName: job.title }),
        };
        updateProject(chosen.id, patch);
        const project = { ...chosen, ...patch };
        builtFrom.current.set(job.id, project);
        return project;
      }

      const created = createProject({
        name: job.projectChoiceName?.trim() || job.title,
        description: (job.description || job.conceptPrompt).trim(),
      });
      const patch = {
        productName: job.title,
        buildId: job.id,
        products: built,
      };
      updateProject(created.id, patch);
      const project = { ...created, ...patch };
      builtFrom.current.set(job.id, project);
      return project;
    },
    [projects, createProject, updateProject],
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
  }, []);

  const activeProject =
    activeProjectId === null
      ? null
      : (projects.find((p) => p.id === activeProjectId) ?? null);

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
    projectFromBuild,
    selectProject,
    updateProject,
    setCover,
    markStepCompleted,
    setStatus,
    backfillShowcase,
    clearActive,
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
