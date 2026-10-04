// The product page's pure readers — /projects/[id]/products/[productId]
// (spec §3.4, §5.7). Which saved version of one product the page shows, what
// its version select lists and which notice sits above it (COR-41, COR-108),
// which tabs its one strip has (COR-32, COR-37, P2-EDITOR-16), how many of
// its pieces are ready (COR-31), and its URL with one key changed. The booked facts are the
// Products tab's own `productFacts()` (products-tab-view.ts), so the card and
// this page word them the same way.
//
// No React and no storage: the page hands in what project-read.ts derived —
// `productsOfProject()` and `versionsOf()` — so the version select and the
// rail's Versions block read one list and can't disagree (COR-106). Its only
// imports are type-only, so it compiles and runs under `node --test` alone.

import type { BuildItem, BuildItemKind, BuildJob } from "../create/history";
import type { ProjectProduct, ProjectVersion } from "./project-read";

// ───────────────────────────── versions ─────────────────────────────

/** One row of the version select. */
export type VersionOption = {
  n: number;
  /** When the version was saved into the project; for one saved before that
   *  was recorded, when its build ran; null when neither is known. */
  at: number | null;
  /** The lineage's newest saved version. */
  current: boolean;
  /** This product is in that version's build. */
  has: boolean;
  /** That version's build isn't in this browser any more. */
  gone: boolean;
};

export type VersionNotice =
  /** "You're viewing version {n} ({at}). The project now uses version {latest}." + Back to latest (COR-41) */
  | { kind: "older"; n: number; at: number | null; latest: number }
  /** "Version {latest} doesn't include {product} — this is version {n}, the last one that did." No Back to latest (COR-108) */
  | { kind: "dropped"; n: number; latest: number }
  /** "Not in version {n}", with a link to the nearest version that has it (COR-41) */
  | { kind: "absent"; n: number; nearest: number }
  /** The version's build is gone from this browser, so nothing of it can be shown */
  | { kind: "gone"; n: number; nearest: number };

export type ProductVersionView = {
  /** Oldest first. The select shows only when there is more than one. */
  options: VersionOption[];
  /** The lineage's newest saved version. */
  latest: number;
  /** Where the page opens with no `?v`: the last version that has this
   *  product — the current one, or for a dropped product the last it was in. */
  home: number;
  /** The version on screen. */
  shown: number;
  /** The build behind the version on screen. */
  build: { buildId: string; job: BuildJob | null };
  /** This product's `BuildProduct.id` inside that build; null when the
   *  version doesn't have it or its build is gone. */
  productId: string | null;
  notice: VersionNotice | null;
};

/** "?v=2" → 2. Anything that isn't a whole number from 1 reads as no `?v`. */
export function parseVersionParam(v: string | null): number | null {
  if (v === null || !/^[1-9]\d{0,5}$/.test(v)) return null;
  return Number(v);
}

const builtAt = (job: BuildJob | null) => (job ? job.endedAt ?? job.createdAt : null);

type Slot = {
  n: number;
  buildId: string;
  job: BuildJob | null;
  at: number | null;
  productId: string | null;
};

/** Which version of `product` the page shows for `?v=` (COR-41, COR-108).
 *  Null for a product no build stands behind — made by hand, its build gone,
 *  or unmatched — which has no deliverables to show at any version. */
export function productVersionView(
  product: ProjectProduct,
  versions: ProjectVersion[][],
  v: string | null,
): ProductVersionView | null {
  const built = product.built;
  if (!built) return null;
  const home = built.ref.version;

  // The lineage is the group that holds the product's own build.
  const group = versions.find((g) => g.some((x) => x.buildId === built.ref.buildId)) ?? [];
  const slots: Slot[] = group.map((x) => {
    const entry = x.products.find((p) => p.rowId === product.id);
    const productId = !x.job
      ? null
      : entry
        ? entry.productId
        : x.buildId === built.ref.buildId
          ? built.product.id
          : null;
    return { n: x.version, buildId: x.buildId, job: x.job, at: x.savedAt ?? builtAt(x.job), productId };
  });
  // versionsOf() always holds the product's own build; should it ever not,
  // the page still shows that one version rather than nothing.
  if (!slots.some((s) => s.n === home)) {
    slots.push({
      n: home,
      buildId: built.ref.buildId,
      job: built.ref.job,
      at: built.ref.savedAt ?? builtAt(built.ref.job),
      productId: built.product.id,
    });
  }
  slots.sort((a, b) => a.n - b.n);
  const latest = slots[slots.length - 1].n;

  const asked = parseVersionParam(v);
  const shown = asked !== null && slots.some((s) => s.n === asked) ? asked : home;
  const slot = slots.find((s) => s.n === shown)!;

  // The closest version that has the product; a tie goes to the newer one.
  const nearest = slots
    .filter((s) => s.productId !== null)
    .reduce<Slot | null>((best, s) => {
      if (!best) return s;
      const d = Math.abs(s.n - shown);
      const bd = Math.abs(best.n - shown);
      return d < bd || (d === bd && s.n > best.n) ? s : best;
    }, null);
  const near = nearest?.n ?? home;

  let notice: VersionNotice | null = null;
  if (shown === home) {
    notice = product.dropped ? { kind: "dropped", n: home, latest } : null;
  } else if (!slot.job) {
    notice = { kind: "gone", n: shown, nearest: near };
  } else if (!slot.productId) {
    notice = { kind: "absent", n: shown, nearest: near };
  } else if (shown !== latest) {
    notice = { kind: "older", n: shown, at: slot.at, latest };
  }

  return {
    options: slots.map((s) => ({
      n: s.n,
      at: s.at,
      current: s.n === latest,
      has: s.productId !== null,
      gone: !s.job,
    })),
    latest,
    home,
    shown,
    build: { buildId: slot.buildId, job: slot.job },
    productId: slot.productId,
    notice,
  };
}

// ───────────────────────────── pieces ─────────────────────────────

/** "{ready} of {total} pieces ready" for ONE product — A2's `piecesOf(job)`
 *  counts the whole build. A piece the build never made isn't one. */
export function productPiecesOf(items: BuildItem[]): { ready: number; total: number } {
  const live = items.filter((i) => i.status !== "skipped");
  return { ready: live.filter((i) => i.status === "ready").length, total: live.length };
}

// ───────────────── the product page's tab strip (P2-EDITOR-16) ─────────────────

/** Media · the build's pieces · Contributors · Customers, in spec §2.3's
 *  order. Media is first because it is the one tab every product has —
 *  built, hand, build-gone or unmatched alike — and it is never written to
 *  `?tab=` (it's what an unknown or absent one reads as). */
export const PRODUCT_TABS = [
  "media",
  "3d",
  "pcb",
  "code",
  "wiring",
  "parts",
  "contributors",
  "customers",
] as const;
export type ProductTabId = (typeof PRODUCT_TABS)[number];

const PIECE_TABS: ReadonlyArray<{ kind: BuildItemKind; tab: ProductTabId }> = [
  { kind: "3d", tab: "3d" },
  { kind: "pcb", tab: "pcb" },
  { kind: "code", tab: "code" },
  { kind: "wiring", tab: "wiring" },
  { kind: "parts", tab: "parts" },
];

/** The tabs one product page shows (P2-EDITOR-16, 17):
 *  - Media always leads;
 *  - a built product (dropped, COR-108, included — `dropped` is an overlay
 *    on `state: "built"`, not its own state) adds the build's own pieces,
 *    one tab per `items` kind that isn't skipped, in the fixed module
 *    order, skipping Firmware code when `gates.firmware` is false (O12: no
 *    firmware source before purchase). A hand, build-gone or unmatched
 *    product gets none of these — P2-EDITOR-9's source line says why
 *    instead;
 *  - Contributors and Customers each show only when their own gate says so.
 *    The caller decides that from the viewer and the counts (the owner
 *    sees the roster; a buyer preview sees a team credit only with ≥ 1
 *    contributor, and never Customers, P2-EDITOR-17) — this function only
 *    places the tab where the gate is true. */
export function productTabsOf(
  product: ProjectProduct,
  items: BuildItem[] | null,
  gates: { firmware: boolean; contributors: boolean; customers: boolean },
): ProductTabId[] {
  const tabs: ProductTabId[] = ["media"];

  if (product.state === "built" && items) {
    for (const { kind, tab } of PIECE_TABS) {
      if (tab === "code" && !gates.firmware) continue;
      const item = items.find((i) => i.kind === kind);
      if (item && item.status !== "skipped") tabs.push(tab);
    }
  }

  if (gates.contributors) tabs.push("contributors");
  if (gates.customers) tabs.push("customers");
  return tabs;
}

/** The tab `?tab=` asks for, when the strip actually has it; Media otherwise
 *  — an unknown or absent `?tab=` always reads as Media (P2-EDITOR-16). */
export function pickProductTab(tabs: readonly ProductTabId[], asked: string | null): ProductTabId {
  return tabs.includes(asked as ProductTabId) ? (asked as ProductTabId) : "media";
}

// ───────────────────────────── URL ─────────────────────────────

/** The page's query with some keys set or (null) removed — every other key,
 *  `view=buyer` among them, carried as it was (COR-37). "" when empty. */
export function withQuery(search: string, patch: Record<string, string | null>): string {
  const q = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) q.delete(key);
    else q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
