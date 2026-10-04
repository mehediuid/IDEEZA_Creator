// The project page's URL state and names (spec §5.3, §5.5; Phase 2 §2.2):
// which tab the address asks for, which tabs a viewer sees, which record it
// names, and the document titles. Pure, so node:test covers it
// (tests/projects/project-route.test.mjs). `?view=buyer` and
// `?view=contributor&as=<id>` are the previews' own parameters
// (lib/manual/buyer-preview.ts); withTab keeps them, like every other parameter.

import { can, type Viewer } from "./permissions";

/** The page tabs, in strip order (COR-19; Phase 2 §2.2). The people tabs were appended, so a tab
 *  a maker has learned never moved. The strip is the same in every project state; only the
 *  viewer changes which appear (`projectTabsFor`). */
export const PROJECT_TABS = ["products", "media", "network", "contributors", "customers"] as const;
export type ProjectTabId = (typeof PROJECT_TABS)[number];

export const PROJECT_TAB_LABEL: Record<ProjectTabId, string> = {
  products: "Products",
  media: "Media",
  network: "Network",
  contributors: "Contributors",
  customers: "Customers",
};

/** `?tab=` → the tab it asks for. Products is the default, so it is never
 *  written (COR-20), and an unknown value reads as Products. */
export function parseProjectTab(raw: string | null): ProjectTabId {
  return raw !== null && (PROJECT_TABS as readonly string[]).includes(raw) ? (raw as ProjectTabId) : "products";
}

/**
 * The tabs a viewer sees, in strip order (P2-TABS-1 as changed; §2.2's table). It replaces the
 * page's `hiddenTabs` arrays.
 * - Products and Media: everyone.
 * - Network: the owner and a contributor preview always (Create Network is its own empty
 *   state); a buyer preview or a demo buyer only once there is a network to read (COR-49) —
 *   `networkReadable` is "the store is read and this project has one".
 * - Contributors: the owner (the roster) and a contributor preview (read-only) always; a buyer
 *   preview or a demo buyer as a team credit, only with ≥ 1 contributor (C18).
 * - Customers: the owner only (`customers.see`; customers are private, C25).
 */
export function projectTabsFor(viewer: Viewer, facts: { networkReadable: boolean; contributors: number }): ProjectTabId[] {
  const visitorLike = viewer.kind === "owner-preview" || viewer.kind === "demo-buyer";
  return PROJECT_TABS.filter((id) => {
    switch (id) {
      case "products":
      case "media":
        return true;
      case "network":
        return !visitorLike || facts.networkReadable;
      case "contributors":
        return can(viewer, "people.seeRoster") || (can(viewer, "people.seeTeam") && facts.contributors > 0);
      case "customers":
        return can(viewer, "customers.see");
    }
  });
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

/** "{project} · Explore marketplace · IDEEZA": the buyer view's title (§2.4). */
export function marketDocTitle(project: string): string {
  return `${project} · Explore marketplace · IDEEZA`;
}

/** "{product} · {project} · IDEEZA": the product page's title (COR-3). */
export function productDocTitle(product: string, project: string): string {
  return `${product} · ${project} · IDEEZA`;
}
