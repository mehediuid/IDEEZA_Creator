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

export type ManualProjectStatus = "draft" | "completed";

export type ManualFlowState = {
  pcb: boolean;
  code: boolean;
  three: boolean;
  preview: boolean;
  wiring: boolean;
  brief: boolean;
};

export const EMPTY_FLOW_STATE: ManualFlowState = {
  pcb: false,
  code: false,
  three: false,
  preview: false,
  wiring: false,
  brief: false,
};

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
  status: ManualProjectStatus;
  createdAt: number;
  updatedAt: number;
  flowState: ManualFlowState;
};

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

// Normalize projects loaded from storage: backfill slugs (unique within the
// batch) and default productName for projects saved before those fields
// existed. Returns the same reference when nothing changed so React skips
// needless re-renders.
function normalizeProjects(list: ManualProject[]): ManualProject[] {
  const taken = new Set<string>();
  return list.map((p) => {
    let slug = p.slug || slugify(p.name);
    const base = slug;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);
    const productName = p.productName ?? "";
    if (p.slug === slug && p.productName !== undefined) return p;
    return { ...p, slug, productName };
  });
}

type Ctx = {
  hydrated: boolean;
  projects: ManualProject[];
  activeProjectId: string | null;
  activeProject: ManualProject | null;
  findBySlug: (slug: string) => ManualProject | null;
  // Mutations
  createProject: (input: { name: string; description: string }) => ManualProject;
  selectProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<Omit<ManualProject, "id">>) => void;
  markStepCompleted: (id: string, step: keyof ManualFlowState) => void;
  setStatus: (id: string, status: ManualProjectStatus) => void;
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

  React.useEffect(() => {
    const stored = normalizeProjects(loadJSON<ManualProject[]>(PROJECTS_KEY, []));
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
      setActiveProjectId(project.id);
      return project;
    },
    [projects],
  );

  const selectProject = React.useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const updateProject = React.useCallback(
    (id: string, patch: Partial<Omit<ManualProject, "id">>) => {
      setProjects((arr) =>
        arr.map((p) =>
          p.id === id
            ? { ...p, ...patch, updatedAt: Date.now() }
            : p,
        ),
      );
    },
    [],
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
    selectProject,
    updateProject,
    markStepCompleted,
    setStatus,
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
export const FLOW_STEPS: Array<keyof ManualFlowState> = [
  "pcb",
  "code",
  "three",
  "preview",
  "wiring",
  "brief",
];

// URL segment per flow step. The 3D step lives at `/3d` for brevity while its
// state key is `three`.
export const STEP_URL_SEGMENT: Record<keyof ManualFlowState, string> = {
  pcb: "pcb",
  code: "code",
  three: "3d",
  preview: "preview",
  wiring: "wiring",
  brief: "brief",
};

// Inverse: URL segment → flow step. Resolves `/project/<slug>/<segment>`.
export const SEGMENT_TO_STEP: Record<string, keyof ManualFlowState> = {
  pcb: "pcb",
  code: "code",
  "3d": "three",
  preview: "preview",
  wiring: "wiring",
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
  preview: "Product Preview",
  wiring: "Wiring",
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
