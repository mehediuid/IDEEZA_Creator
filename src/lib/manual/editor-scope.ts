// The product-scoped editor (spec §3.5.8, owner decision 7: "editor a to
// product open hobe" — the editor opens a PRODUCT, not a project). Every
// document an editor step reads or writes is keyed by project AND product
// row, so a multi-product project can hold one board, one 3D scene and one
// firmware per product instead of one shared set (v1 COR-63, COR-94).
//
// Pure — no React, no storage reads. Relative imports only: the node:test
// harness compiles this file with tsc, which leaves `@/…` specifiers
// unresolved in its output (tests/projects/tsconfig.json).
//
// A safe cycle: this file and project-storage.ts import one keyed export
// from each other (editorKeysOf / OPENED_EVERY_MS). Neither is read at
// module-evaluation time — only from inside a function body, once both
// modules have finished loading — which is the same tolerated pattern
// project-read.ts documents for its own cycle with projects.tsx.

import {
  STEP_LABELS,
  STEP_URL_SEGMENT,
  SEGMENT_TO_STEP,
  type ManualProject,
  type ManualProductInput,
  type ProjectPatch,
  type ProjectStep,
} from "./projects";
import { productRowsOf } from "./project-read";
import { OPENED_EVERY_MS } from "./project-storage";
import type { EditorDoc, EditorScope, EditorStep } from "./p2-types";

// ───────────────────────────── steps ─────────────────────────────

/** Every editor step, in the module order (UIUX-80) — every `ProjectStep`
 *  but Brief, which is project-level, not a product step. */
export const EDITOR_STEPS: readonly EditorStep[] = ["pcb", "code", "three", "assembly", "wiring", "preview"];

// ───────────────────────────── URLs ─────────────────────────────

/** The product-scoped editor URL: `/project/<slug>/products/<productId>/<segment>`
 *  (P2-EDITOR-1). Accepts either a project or a bare slug, like `stepHref`. */
export function editorHref(
  project: ManualProject | string,
  productId: string,
  step: EditorStep,
): string {
  const slug = typeof project === "string" ? project : project.slug;
  return `/project/${slug}/products/${productId}/${STEP_URL_SEGMENT[step]}`;
}

/** Reads either route shape:
 *  - `/project/<slug>/products/<productId>/<segment>` (new, P2-EDITOR-1);
 *  - `/project/<slug>/<segment>` (legacy, P2-EDITOR-2) — `productId` is null,
 *    because the caller still has to resolve it (`resumeProductOf`).
 *  Null for anything else, an unknown segment, or `.../products/<id>/brief`
 *  (the Brief is project-level and has no product route, P2-EDITOR-1). */
export function parseEditorPath(
  pathname: string,
): { slug: string; productId: string | null; step: ProjectStep } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "project" || !parts[1]) return null;
  const slug = parts[1];

  if (parts[2] === "products") {
    if (!parts[3] || !parts[4] || parts.length > 5) return null;
    const step = SEGMENT_TO_STEP[parts[4]];
    if (!step || step === "brief") return null;
    return { slug, productId: parts[3], step };
  }

  if (parts[2] && parts.length === 3) {
    const step = SEGMENT_TO_STEP[parts[2]];
    if (!step) return null;
    return { slug, productId: null, step };
  }

  return null;
}

/** A legacy `/project/<slug>/<step>` visit resumes one product, in order
 *  (P2-EDITOR-2):
 *  1. `lastOpened.productId`, when that row still exists;
 *  2. else the first row the current version includes (not dropped) —
 *     judged from the project's own `builds[]` (chatId + version), which
 *     needs no build history lookup;
 *  3. else the first row. */
export function resumeProductOf(p: ManualProject): string {
  const rows = productRowsOf(p);

  const lastId = p.lastOpened?.productId;
  if (lastId && rows.some((r) => r.id === lastId)) return lastId;

  const builds = p.builds ?? [];
  const maxVersionByChat = new Map<string, number>();
  for (const b of builds) {
    if (b.chatId === null) continue;
    if ((maxVersionByChat.get(b.chatId) ?? 0) < b.version) maxVersionByChat.set(b.chatId, b.version);
  }
  const buildById = new Map(builds.map((b) => [b.buildId, b] as const));
  const current = rows.find((r) => {
    if (!r.source) return true; // a hand row belongs to no lineage, so it's never "dropped"
    const b = buildById.get(r.source.buildId);
    if (!b || b.chatId === null) return true; // not tracked by version history — treat as current
    const max = maxVersionByChat.get(b.chatId) ?? b.version;
    return b.version >= max;
  });

  return (current ?? rows[0]).id;
}

/** Where a product row resumes: its own `editorOpened` record, or PCB when
 *  it has never been opened (P2-EDITOR-9's fallback). `stamped` tells
 *  `openInEditorOf` whether to name the step in the button's label. */
export function productResumeOf(p: ManualProject, rowId: string): { step: EditorStep; stamped: boolean } {
  const rec = p.editorOpened?.[rowId];
  return rec ? { step: rec.step, stamped: true } : { step: "pcb", stamped: false };
}

/** "Open in editor" / "Open in editor · {Step}" plus its href (P2-EDITOR-9). */
export function openInEditorOf(p: ManualProject, rowId: string): { label: string; href: string } {
  const { step, stamped } = productResumeOf(p, rowId);
  return {
    label: stamped ? `Open in editor · ${STEP_LABELS[step]}` : "Open in editor",
    href: editorHref(p, rowId, step),
  };
}

// ───────────────────────────── resume record ─────────────────────────────

/** Records that `rowId` was opened at `step` (P2-EDITOR-7): per-product
 *  `editorOpened[rowId]`, and `lastOpened` as the legacy-URL resolver's
 *  input. At most one write per (product, step) per minute, and never
 *  touches `updatedAt` — opening a step changes nothing in the project.
 *  Replaces `stampOpened`'s call site once the provider (T09) switches
 *  `touchOpened` over to it; `stampOpened` stays in `project-storage.ts`
 *  until then. */
export function stampEditorOpened(
  p: ManualProject,
  rowId: string,
  step: EditorStep,
  now: number,
): ManualProject {
  const rec = p.editorOpened?.[rowId];
  if (rec && rec.step === step && now - rec.at < OPENED_EVERY_MS) return p;
  return {
    ...p,
    editorOpened: { ...p.editorOpened, [rowId]: { step, at: now } },
    lastOpened: { step, at: now, productId: rowId },
  };
}

// ───────────────────────────── naming ─────────────────────────────

/** Generalises `renameHeadline` (COR-95) to any row (P2-EDITOR-6):
 *  - the virtual "p1" (no stored rows) writes `productName`;
 *  - renaming the first stored row also moves the headline while the two
 *    still agree, so the list never goes on calling it by its old name;
 *  - an empty name is refused — no patch, and the row keeps its name. */
export function renameProduct(p: ManualProject, rowId: string, name: string, now: number): ProjectPatch {
  const clean = name.trim();
  if (!clean) return {};

  if (!p.products?.length) {
    return rowId === "p1" ? { productName: clean } : {};
  }

  const idx = p.products.findIndex((r) => r.id === rowId);
  if (idx < 0) return {};

  const products: ManualProductInput[] = p.products.map((r, i) =>
    i === idx ? { ...r, name: clean, updatedAt: now } : r,
  );
  const patch: ProjectPatch = { products };
  if (idx === 0 && p.products[0].name === p.productName) patch.productName = clean;
  return patch;
}

/** The row a build product lives in, for SAVE's "review this version" button
 *  and BUILDLOAD's seeding. Null when no row was built from it. */
export function rowOfBuildProduct(p: ManualProject, buildId: string, productId: string): string | null {
  return productRowsOf(p).find((r) => r.source?.buildId === buildId && r.source?.productId === productId)?.id ?? null;
}

// ───────────────────────────── document keys ─────────────────────────────

/** Every document's base key. The product-scoped key is `<base>:<projectId>:<productId>`. */
const DOC_BASE: Record<EditorDoc, string> = {
  pcb: "ideeza:pcb:doc", // pcb/store.tsx PCB_DOC_PREFIX
  wiring: "ideeza:wiring:doc", // wiring-context.tsx docKey()
  assembly: "ideeza:assembly", // assembly-app.tsx PROGRESS_PREFIX
  "three.ai": "ideeza:three:aimodel", // ai-generate-modal.tsx storeKey()
  "three.shapes": "ideeza:3d:shapes", // three-app.tsx SHAPES_KEY
  "three.right": "ideeza:3d:right", // three-app.tsx RIGHT_KEY
  "three.sketches": "ideeza:3d:sketches", // sketch-mode.tsx
  "code.files": "ideeza:code:files", // dev-editor.tsx STORAGE_KEY
  "code.blockly": "ideeza:code:blockly-workspace", // blockly-impl.tsx
  "preview.canvas": "ideeza:preview:canvas", // preview-context.tsx CANVAS_KEY
  "preview.mates": "ideeza:preview:mates", // preview-context.tsx MATES_KEY
};

/** The 4 docs that had a per-project (not global) key before P2, so the
 *  project's first row can adopt it once (P2-EDITOR-3). The other 7 were
 *  already shared by every project in this browser, so there is nothing of
 *  ONE project's to adopt (P2-EDITOR-4/C4) — that is P2-EDITOR-5's "Bring it
 *  in" banner, a different, maker-confirmed path. */
const PER_PROJECT_LEGACY: ReadonlySet<EditorDoc> = new Set(["pcb", "wiring", "assembly", "three.ai"]);

/** The 5 docs BUILDLOAD seeds from a build and can Load/Restore by version —
 *  the ones that keep a one-slot `:prev` backup (BUILDLOAD §3.1, C6). */
const SEED_DOCS: ReadonlySet<EditorDoc> = new Set(["pcb", "three.shapes", "three.ai", "code.files", "wiring"]);

const ALL_DOCS: readonly EditorDoc[] = [
  "pcb",
  "wiring",
  "assembly",
  "three.ai",
  "three.shapes",
  "three.right",
  "three.sketches",
  "code.files",
  "code.blockly",
  "preview.canvas",
  "preview.mates",
];

/** The product-scoped key for `doc`. Project ids (`proj_…`) and row ids
 *  (`prd_…`, `p<n>`) hold no `:`, so this can never equal a legacy key or
 *  another project's key. */
export function editorDocKey(doc: EditorDoc, s: EditorScope): string {
  return `${DOC_BASE[doc]}:${s.projectId}:${s.productId}`;
}

/** The pre-P2 key `doc` held, or null when it was already global (nothing
 *  ONE project can claim). */
export function legacyDocKey(doc: EditorDoc, projectId: string): string | null {
  return PER_PROJECT_LEGACY.has(doc) ? `${DOC_BASE[doc]}:${projectId}` : null;
}

/** The read order for a scoped document (P2-EDITOR-3, BUILDLOAD C6):
 *  1. the scoped key;
 *  2. else, only for the project's first row, the legacy key (the caller
 *     still has to check it isn't pristine before treating it as adopted —
 *     this function has no storage access to do that itself);
 *  3. else the editor's own default.
 *  `adoptFrom` is null off the first row, and for every doc with no legacy
 *  key at all. */
export function docReadKeys(
  doc: EditorDoc,
  s: EditorScope,
  headRowId: string,
): { key: string; adoptFrom: string | null } {
  const key = editorDocKey(doc, s);
  const adoptFrom = s.productId === headRowId ? legacyDocKey(doc, s.projectId) : null;
  return { key, adoptFrom };
}

/** BUILDLOAD's seed record: `ideeza:editor:seed:<projectId>:<productId>`. */
export function seedRecordKey(s: EditorScope): string {
  return `ideeza:editor:seed:${s.projectId}:${s.productId}`;
}

/** The one backup slot a seeded document keeps (BUILDLOAD's Load/Restore). */
export function prevKey(key: string): string {
  return `${key}:prev`;
}

/** Every key one product row's editor documents can occupy — the exact set
 *  the delete sweep removes for it, for the delete sweep (`project-storage.ts`).
 *  Per row: every scoped document key, the `:prev` backup for the 5 seeded
 *  docs, and the seed record (BUILDLOAD C6). The 4 legacy per-project keys
 *  are NOT here — `projectStorageKeys` adds those once, not per row. */
export function editorKeysOf(projectId: string, rowIds: readonly string[]): string[] {
  const keys: string[] = [];
  for (const rowId of rowIds) {
    const scope: EditorScope = { projectId, productId: rowId };
    for (const doc of ALL_DOCS) {
      const key = editorDocKey(doc, scope);
      keys.push(key);
      if (SEED_DOCS.has(doc)) keys.push(prevKey(key));
    }
    keys.push(seedRecordKey(scope));
  }
  return keys;
}
