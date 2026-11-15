// The product ⋯ menu's two record writes (owner, 2026-11-15): Edit name and
// description, and Delete product…. Pure — the provider (projects.tsx)
// applies them to the record as it stands when the write lands, and node:test
// runs them as they are. What a delete may remove, and when it is blocked, is
// delete-plan.ts's (it reads the market, which engineering doesn't).
//
// A safe cycle, the one editor-scope.ts documents: projects.tsx imports this
// file, and this file reads editor-scope.ts's `editorKeysOf`, which imports
// projects.tsx. Nothing here runs at module evaluation, only inside functions.
// Relative imports only: tsc leaves `@/…` unresolved in the test build.

import { editorKeysOf } from "./editor-scope";
import type { ManualProductInput, ManualProject, ProjectPatch } from "./projects";

/** Edit name and description on one row. The name is trimmed and required; the description is
 *  trimmed and may be empty.
 *  - A project with no stored rows has its one product as the virtual "p1": a new name writes
 *    `productName` (as renameProduct does); a new description stores the row, so the product's
 *    words stop being the project's own description (addHandProduct stores it the same way).
 *  - The first stored row carries the headline name while the two agree (COR-95).
 *  - No change, an empty name or an unknown row: no patch. */
export function productDetailsPatch(
  p: ManualProject,
  rowId: string,
  details: { name: string; description: string },
  now: number,
): ProjectPatch {
  const name = details.name.trim();
  const description = details.description.trim();
  if (!name) return {};

  if (!p.products?.length) {
    if (rowId !== "p1") return {};
    if (description === p.description.trim()) return name === p.productName ? {} : { productName: name };
    return { productName: name, products: [{ id: "p1", name, description, updatedAt: now }] };
  }

  const idx = p.products.findIndex((r) => r.id === rowId);
  if (idx < 0) return {};
  const row = p.products[idx];
  if (row.name === name && row.description === description) return {};
  const products: ManualProductInput[] = p.products.map((r, i) =>
    i === idx ? { ...r, name, description, updatedAt: now } : r,
  );
  const patch: ProjectPatch = { products };
  if (idx === 0 && row.name === p.productName) patch.productName = name;
  return patch;
}

/** The record without row `rowId`, or null when it can't go: a project with fewer than two stored
 *  rows (its only product), or a row it doesn't hold. The row's resume record goes with it, and
 *  so does the cover when the project used this product's image. Deleting the first row moves
 *  the headline name to the row that is first now. Bumps updatedAt. */
export function withoutProduct(p: ManualProject, rowId: string, now: number): ManualProject | null {
  const rows = p.products ?? [];
  const idx = rows.findIndex((r) => r.id === rowId);
  if (idx < 0 || rows.length < 2) return null;
  const products = rows.filter((r) => r.id !== rowId);
  const next: ManualProject = { ...p, products, updatedAt: now };
  if (idx === 0) next.productName = products[0].name;
  if (p.editorOpened && rowId in p.editorOpened) {
    next.editorOpened = Object.fromEntries(Object.entries(p.editorOpened).filter(([id]) => id !== rowId));
  }
  if (p.lastOpened?.productId === rowId) delete next.lastOpened;
  const source = rows[idx].source;
  if (source && p.cover && p.cover.buildId === source.buildId && p.cover.productId === source.productId) {
    next.cover = null;
  }
  return next;
}

/** Every browser key one row's editor documents can hold — its scoped documents, their `:prev`
 *  backups and its seed record (`editorKeysOf`) — plus, for the project's first row, the four
 *  legacy per-project keys that row adopts (P2-EDITOR-3), so the row that is first next never
 *  adopts the deleted product's old work. The same literals as `projectStorageKeys`. */
export function productStorageKeys(projectId: string, rowId: string, head: boolean): string[] {
  return [
    ...editorKeysOf(projectId, [rowId]),
    ...(head
      ? [
          `ideeza:pcb:doc:${projectId}`,
          `ideeza:wiring:doc:${projectId}`,
          `ideeza:assembly:${projectId}`,
          `ideeza:three:aimodel:${projectId}`,
        ]
      : []),
  ];
}
