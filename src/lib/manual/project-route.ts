// The project page's URL state and names (spec §5.3, §5.5; Phase 2 §2.2;
// Build and Earn P0): which tab the address asks for, which tabs a viewer
// sees, the old addresses that now live in Earn, which record it names, and
// the document titles. Pure, so node:test covers it
// (tests/projects/project-route.test.mjs). `?view=buyer` and
// `?view=contributor&as=<id>` are the previews' own parameters
// (lib/manual/buyer-preview.ts); withTab keeps them, like every other parameter.

import { earnHref } from "./earn-route";
import { can, type Viewer } from "./permissions";

/** The page tabs, in strip order (COR-19; Phase 2 §2.2; Build and Earn P0). The page is
 *  engineering only: Customers moved to Earn, and Contributors became Team — name and role,
 *  the ownership % moved to Earn › Splits. The strip is the same in every project state; only
 *  the viewer changes which appear (`projectTabsFor`). */
export const PROJECT_TABS = ["products", "media", "network", "team"] as const;
export type ProjectTabId = (typeof PROJECT_TABS)[number];

export const PROJECT_TAB_LABEL: Record<ProjectTabId, string> = {
  products: "Products",
  media: "Media",
  network: "Network",
  team: "Team",
};

/** Old `?tab=` values that still open a tab: the Contributors tab is Team now (P0). */
const TAB_ALIAS: Readonly<Record<string, ProjectTabId>> = { contributors: "team" };

/** `?tab=` → the tab it asks for. Products is the default, so it is never
 *  written (COR-20); `?tab=contributors` opens Team, and an unknown value reads
 *  as Products. `?tab=customers` never gets here: the route sends it to Earn
 *  (`projectRedirectOf`). */
export function parseProjectTab(raw: string | null): ProjectTabId {
  if (raw === null) return "products";
  if ((PROJECT_TABS as readonly string[]).includes(raw)) return raw as ProjectTabId;
  return TAB_ALIAS[raw] ?? "products";
}

/** The buyer's side of commerce: Preview as buyer (`?view=buyer`) and a demo buyer on Explore
 *  marketplace. They read the page as it was before Build and Earn — the status chip and line,
 *  the Marketplace and Legal blocks, the product's editions — because the public listing pages
 *  are not changed in P0. The owner and a contributor preview read the engineering page. */
export function buyerSide(viewer: Viewer): boolean {
  return viewer.kind === "owner-preview" || viewer.kind === "demo-buyer";
}

/** The addresses on `/projects/<id>` that moved to Earn (P0): `?list=1` opens the listing flow
 *  in Earn › Project NFT, and `?tab=customers` is Earn › Customers, a `sale=` deep link kept.
 *  Null when the address stays on the page. Takes the route's `searchParams` as Next hands them. */
export function projectRedirectOf(
  projectId: string,
  query: Readonly<Record<string, string | string[] | undefined>>,
): string | null {
  const one = (key: string) => {
    const v = query[key];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };
  if (one("list") === "1") return earnHref(projectId, "sell", { list: "1" });
  if (one("tab") === "customers") {
    const sale = one("sale");
    return earnHref(projectId, "customers", sale ? { sale } : undefined);
  }
  return null;
}

/**
 * The tabs a viewer sees, in strip order (P2-TABS-1 as changed; §2.2's table). It replaces the
 * page's `hiddenTabs` arrays.
 * - Products and Media: everyone.
 * - Network: the owner and a contributor preview always (Create Network is its own empty
 *   state); a buyer preview or a demo buyer only once there is a network to read (COR-49) —
 *   `networkReadable` is "the store is read and this project has one".
 * - Team: the owner and a contributor preview always (an empty Team teaches where people are
 *   added); a buyer preview or a demo buyer only with ≥ 1 contributor (C18).
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
      case "team":
        return can(viewer, "people.seeRoster") || (can(viewer, "people.seeTeam") && facts.contributors > 0);
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
