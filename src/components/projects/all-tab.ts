// My projects' All tab holds everything (owner, 2026-11-19: "All should have everything in it — why are the
// purchased ones somewhere else?"): the maker's own projects and the projects the active demo creator bought from,
// in one order, one search and one set of pages. The outcome tabs (Draft, Minted, Listed, Sold) and the Shared only
// filter are about the maker's own projects, so they keep only those; Purchased keeps only the purchases.
//
// A whole project bought is already one of the buyer's own projects (acquired-projects.ts), so its purchase shows
// once, as that project; a purchase that also holds copies keeps its own card for them.
//
// Web only: the phone shares the list (lib/manual/project-list.ts), not this. It sits with My projects, which composes
// the maker's projects (engineering) and the purchases (commerce); neither layer imports the other. Pure. Relative
// imports only (node:test loads the compiled module).

import { ACQUIRED_PREFIX } from "../../lib/demo/acquired-projects";
import { matchRows, type ListCounts, type ListItem, type ListResult, type ListRow } from "../../lib/manual/project-list";
import { PAGE_SIZE, type ListQuery } from "../../lib/manual/project-summary";
import type { PurchasedProject } from "../../lib/market/purchases";

export type AllEntry = { key: string; kind: "own"; row: ListRow } | { key: string; kind: "bought"; bought: PurchasedProject };

export type AllResult = Omit<ListResult, "rows"> & { entries: AllEntry[] };

/** The purchases the All tab lists: not a whole project already listed as the buyer's own. */
export function boughtForAll(bought: readonly PurchasedProject[], ownIds: ReadonlySet<string>): PurchasedProject[] {
  return bought.filter((p) => !(p.source === "sample" && ownIds.has(`${ACQUIRED_PREFIX}${p.id}`) && p.lines.every((l) => l.kind === "main")));
}

/** A purchase the search finds: its name, its creator or a product's name. */
function boughtMatches(p: PurchasedProject, needle: string): boolean {
  const n = needle.toLowerCase();
  return [p.name, p.creator, ...p.products].some((t) => t.toLowerCase().includes(n));
}

/** When it was first bought: its earliest copy (or sale on, once every copy is sold). */
function firstAtOf(p: PurchasedProject): number {
  const times = [...p.lines.flatMap((l) => l.copies.map((c) => c.at)), ...p.sold.map((s) => s.at)];
  return times.length ? Math.min(...times) : p.lastAt;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

type Sortable = { entry: AllEntry; name: string; id: string; updated: number; created: number };

const ORDER: Record<ListQuery["sort"], (a: Sortable, b: Sortable) => number> = {
  updated: (a, b) => b.updated - a.updated || byName(a, b),
  newest: (a, b) => b.created - a.created || byName(a, b),
  oldest: (a, b) => a.created - b.created || byName(a, b),
  name: (a, b) => byName(a, b),
};

function byName(a: Sortable, b: Sortable): number {
  return collator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** The list's pass with the purchases in All: counts (All counts both), the rows the view keeps in one order, the page. */
export function allTabOf(items: ListItem[], bought: readonly PurchasedProject[], q: ListQuery): AllResult {
  const listed = boughtForAll(bought, new Set(items.map((i) => i.project.id)));
  const { counts: own, showcased, kept } = matchRows(items, q);
  const counts: ListCounts = { ...own, all: own.all + listed.length };
  const needle = q.q.trim();
  const withBought = q.tab === "all" && !q.showcase;
  const boughtKept = withBought ? listed.filter((p) => !needle || boughtMatches(p, needle)) : [];

  const sortable: Sortable[] = [
    ...kept.map((row) => ({
      entry: { key: `own:${row.project.id}`, kind: "own" as const, row },
      name: row.summary.name,
      id: row.summary.id,
      updated: row.summary.sortKey,
      created: row.project.createdAt,
    })),
    ...boughtKept.map((p) => ({
      entry: { key: `bought:${p.source}:${p.id}`, kind: "bought" as const, bought: p },
      name: p.name,
      id: `${p.source}:${p.id}`,
      updated: p.lastAt,
      created: firstAtOf(p),
    })),
  ];
  // Own rows keep the list's own order between them (a matched product, the list's tie-breaks); the purchases join it.
  sortable.sort(ORDER[q.sort]);

  const matched = sortable.length;
  const pageCount = Math.max(1, Math.ceil(matched / PAGE_SIZE));
  const want = Number.isInteger(q.page) && q.page >= 1 ? q.page : 1;
  const page = Math.min(want, pageCount);
  return {
    counts,
    total: items.length + listed.length,
    showcased,
    matched,
    narrowed: q.tab !== "all" || needle !== "" || q.showcase,
    page,
    pageCount,
    entries: sortable.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => s.entry),
  };
}
