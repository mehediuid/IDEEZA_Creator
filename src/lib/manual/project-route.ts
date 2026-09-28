// The project page's URL state and names (spec §5.3, §5.5): which tab the
// address asks for, which record it names, and the document titles. Pure and
// import-free, so node:test covers it (tests/projects/project-route.test.mjs).
// `?view=buyer` is Preview as buyer's own parameter (§5.11,
// lib/manual/buyer-preview.ts); withTab keeps it, like every other parameter.

/** The page tabs, in strip order (COR-19). LATER, "contributors" and
 *  "customers" are appended, so a tab a maker has learned never moves. */
export const PROJECT_TABS = ["products", "media", "network"] as const;
export type ProjectTabId = (typeof PROJECT_TABS)[number];

export const PROJECT_TAB_LABEL: Record<ProjectTabId, string> = {
  products: "Products",
  media: "Media",
  network: "Network",
};

/** `?tab=` → the tab it asks for. Products is the default, so it is never
 *  written (COR-20), and an unknown value reads as Products. */
export function parseProjectTab(raw: string | null): ProjectTabId {
  return raw === "media" || raw === "network" ? raw : "products";
}

/** The tab to show: the one asked for when the strip lists it, else Products.
 *  A tab with no real home is not in the strip (COR-19; COR-49 in Preview as
 *  buyer), so an address naming one lands on Products. */
export function resolveTab(asked: ProjectTabId, shown: readonly ProjectTabId[]): ProjectTabId {
  return shown.includes(asked) ? asked : "products";
}

/** The query string after choosing `tab`, with every other parameter kept
 *  (`view=buyer` above all). Returned without the "?", like buyer-preview's
 *  withView; "" when nothing is left. */
export function withTab(search: string, tab: ProjectTabId): string {
  const params = new URLSearchParams(search);
  if (tab === "products") params.delete("tab");
  else params.set("tab", tab);
  return params.toString();
}

/** The record an address names: by id first, then by slug, so a hand-typed
 *  /projects/<slug> finds the same project (COR-1). */
export function resolveProject<T extends { id: string; slug: string }>(
  list: readonly T[],
  key: string,
): T | null {
  return list.find((p) => p.id === key) ?? list.find((p) => p.slug === key) ?? null;
}

/** "{project} · My projects · IDEEZA" (COR-3). */
export function projectDocTitle(project: string): string {
  return `${project} · My projects · IDEEZA`;
}

/** "{product} · {project} · IDEEZA": the product page's title (COR-3). */
export function productDocTitle(product: string, project: string): string {
  return `${product} · ${project} · IDEEZA`;
}
