// Earn › Sell as a sales desk (owner, 2026-11-18: "this page isn't in a good
// layout, a lot of space is empty" — plan https://claude.ai/artifact/KG362uZ1MZyahtgV1ygmuD,
// direction A with every recommendation, D1–D12). The page is a board — a row
// for the whole project and one per product, a column for each of Main,
// Physical and Virtual — and one item panel for the tile picked. This module
// is the board's facts, read off what the page already derives:
//
// - a tile's chip (its state in one or two words, and a tone), its price, its
//   uses, how much of it has sold and what it has earned (the sales' payouts,
//   the same sum the Overview shows), who bought and when last. The words of a
//   row's full state stay `mainRowStateOf`'s and `copyRowStateOf`'s; this only
//   names them shortly for the tile;
// - which products get a row (D3: a one-product project shows one row, the
//   project, unless that product already has copy tracks of its own);
// - which tile is open on arrival (D5): the one waiting for the maker — a
//   copy track sold out, a buyer in checkout, an auction ending, a paused
//   listing, the Main NFT not listed — else the one sold most recently, else
//   the Main NFT;
// - the line over the board (D6): on sale, sold out, copies sold, earned;
// - where a tile's buyers see it.
//
// Nothing here is a new rule: copies never ask the Main listing, a product has
// no Main NFT, a Main sale of all of it sells the project (selling-rules).
//
// Pure, relative imports only, so node:test loads the compiled module.

import { earnedOf, payoutLinesText, type PayoutLine } from "../commerce/payout";
import { compareAmounts, formatAmount } from "../wallet/money";
import { soldOf, tracksOf } from "./editions";
import { USE_LABEL, type CopyRowState } from "./sell-flow";
import { PROJECT_SCOPE, type EditionKind, type EditionTrack, type ListingView, type Sale } from "./types";

export type DeskKind = "main" | EditionKind;
export const DESK_KINDS: readonly DeskKind[] = ["main", "physical", "virtual"];

/** A tile's tone: the DS Badge tone its chip takes. Colour helps; the word carries the meaning. */
export type DeskTone = "success" | "brand" | "neutral" | "warning" | "info";

export type DeskTile = {
  /** `${scope}:${kind}`: the board's key and the panel's selection. */
  key: string;
  /** `PROJECT_SCOPE` or a product's id. */
  scope: string;
  kind: DeskKind;
  chip: { label: string; tone: DeskTone };
  /** "0.04 ETH", "0.03–0.04 ETH"; null when nothing is priced. */
  price: string | null;
  /** "Buy now", "Personal use", "2 uses", "Top bid"; null for none. */
  uses: string | null;
  /** Copies: sold of made. Main: the share sold, of 100. Null before anything was made or listed. */
  meter: { sold: number; total: number } | null;
  /** "1 of 50 sold", "40% sold"; null with no meter. */
  soldLine: string | null;
  /** The sales' payouts to you, per token. */
  earned: PayoutLine[];
  /** The tile's sales, newest first. */
  sales: Sale[];
  /** Distinct buyers of the tile's sales. */
  buyers: number;
  lastSaleAt: number | null;
  /** On the marketplace now (a live listing, or a copy track listed and not sold out). */
  live: boolean;
  /** D5's order: what waits for the maker comes first; 0 waits for nothing. */
  attention: number;
  /** A word on what stands before selling it ("1 step before listing"), set by the page. */
  hint?: string | null;
};

export const ATTENTION = { soldOut: 100, inCheckout: 90, endingSoon: 80, paused: 70, mainNotListed: 60 } as const;

export const tileKeyOf = (scope: string, kind: DeskKind): string => `${scope}:${kind}`;

/** "0.03–0.04 ETH" for two prices in one token, "0.03 ETH" for one, joined by " · " across tokens. */
export function priceRangeOf(prices: readonly { amount: string; token: string }[]): string | null {
  if (!prices.length) return null;
  const byToken = new Map<string, string[]>();
  for (const p of prices) byToken.set(p.token, [...(byToken.get(p.token) ?? []), p.amount]);
  return [...byToken.keys()]
    .sort()
    .map((token) => {
      const amounts = [...(byToken.get(token) as string[])].sort(compareAmounts);
      const lo = amounts[0];
      const hi = amounts[amounts.length - 1];
      if (compareAmounts(lo, hi) === 0) return formatAmount(lo, token as Sale["token"]);
      const bare = formatAmount(lo, token as Sale["token"]).replace(new RegExp(` ${token}$`), "");
      return `${bare}–${formatAmount(hi, token as Sale["token"])}`;
    })
    .join(" · ");
}

function salesFacts(projectId: string, sales: Sale[]) {
  const newest = [...sales].sort((a, b) => b.at - a.at);
  return {
    earned: earnedOf(newest, projectId),
    sales: newest,
    buyers: new Set(newest.map((s) => s.buyerId)).size,
    lastSaleAt: newest[0]?.at ?? null,
  };
}

/** A Physical or Virtual tile of a scope. `state` is the row's own `copyRowStateOf`. */
export function copyTileOf(f: {
  projectId: string;
  scope: string;
  kind: EditionKind;
  state: CopyRowState;
  tracks: readonly EditionTrack[];
  sales: readonly Sale[];
}): DeskTile {
  const mine = tracksOf(f.scope, [...f.tracks]).filter((t) => t.kind === f.kind);
  const ids = new Set(mine.map((t) => t.id));
  const own = f.sales.filter((s) => s.item.nft !== "main" && ids.has(s.item.trackId));
  const listed = mine.filter((t) => t.listing !== null);
  const soldOutTrack = (t: EditionTrack) => soldOf(t.id, [...f.sales]) >= t.supply.total;
  const allSoldOut = listed.length > 0 && listed.every(soldOutTrack);
  const live = f.state.kind === "manage" && listed.some((t) => !soldOutTrack(t));
  const total = mine.reduce((n, t) => n + t.supply.total, 0);
  const sold = own.length;

  let chip: DeskTile["chip"];
  if (f.state.kind === "manage") chip = allSoldOut ? { label: "Sold out", tone: "brand" } : { label: "On sale", tone: "success" };
  else if (f.state.kind === "sell") chip = { label: "Not selling", tone: "neutral" };
  else if (f.state.link === "mint") chip = { label: "Not minted yet", tone: "neutral" };
  else if (f.state.line.startsWith("Stopped")) chip = { label: "Stopped", tone: "neutral" };
  else if (f.state.line.startsWith("Given")) chip = { label: "Given", tone: "neutral" };
  else chip = { label: "Can't sell", tone: "warning" };

  const pricedTracks = f.state.kind === "manage" ? listed : [];
  return {
    key: tileKeyOf(f.scope, f.kind),
    scope: f.scope,
    kind: f.kind,
    chip,
    price: priceRangeOf(pricedTracks.map((t) => ({ amount: (t.listing as NonNullable<EditionTrack["listing"]>).regular, token: (t.listing as NonNullable<EditionTrack["listing"]>).token }))),
    uses: pricedTracks.length === 1 ? USE_LABEL[pricedTracks[0].use] : pricedTracks.length > 1 ? `${pricedTracks.length} uses` : null,
    meter: total > 0 ? { sold, total } : null,
    soldLine: total > 0 ? `${sold} of ${total} sold` : null,
    ...salesFacts(f.projectId, own),
    live,
    attention: f.state.kind === "manage" && allSoldOut ? ATTENTION.soldOut : 0,
  };
}

/** The Main NFT's tile. `line`/`action` are the row's own `mainRowStateOf`. */
export function mainTileOf(f: {
  projectId: string;
  action: "mint" | "list" | "manage" | "disabled" | "none";
  status: "draft" | "private" | "listed" | "sold" | "given" | string;
  locked: boolean;
  listing: ListingView;
  sales: readonly Sale[];
  inCheckout: boolean;
}): DeskTile {
  const main = f.sales.filter((s) => s.item.nft === "main");
  const pct = main.reduce((n, s) => n + (s.item.nft === "main" ? s.item.sharePct : 0), 0);
  const v = f.listing;
  const minted = f.action !== "mint";
  let chip: DeskTile["chip"] = { label: "Not selling", tone: "neutral" };
  let price: string | null = null;
  let uses: string | null = null;
  let attention = 0;
  let live = false;
  if (!minted) chip = { label: "Not minted yet", tone: "neutral" };
  else if (f.locked) {
    chip = { label: "Sold in full", tone: "brand" };
    price = priceRangeOf(main.map((s) => ({ amount: s.price, token: s.token })));
  } else if (f.status === "given") chip = { label: "Given", tone: "neutral" };
  else if (v.kind === "live") {
    live = true;
    const l = v.listing;
    if (l.type === "auction") {
      const top = v.auction?.top ?? null;
      chip = { label: "Auction", tone: "success" };
      price = formatAmount(top ? top.amount : (l.minBid ?? "0"), l.token);
      uses = top ? "Top bid" : "Opening bid";
      if (v.auction?.phase === "endingSoon") attention = ATTENTION.endingSoon;
    } else {
      chip = { label: "On sale", tone: "success" };
      price = formatAmount(l.price ?? "0", l.token);
      uses = "Buy now";
    }
    if (f.inCheckout) {
      chip = { label: "In checkout", tone: "info" };
      attention = ATTENTION.inCheckout;
    }
  } else if (v.kind === "paused") {
    chip = { label: "Paused", tone: "warning" };
    price = formatAmount(v.listing.price ?? v.listing.minBid ?? "0", v.listing.token);
    attention = ATTENTION.paused;
  } else if (pct > 0) {
    chip = { label: "Part sold", tone: "brand" };
    price = priceRangeOf(main.map((s) => ({ amount: s.price, token: s.token })));
    if (f.action === "list") attention = ATTENTION.mainNotListed;
  } else if (f.action === "list" || f.action === "none") {
    attention = ATTENTION.mainNotListed;
  }
  const shown = minted && (v.kind !== "none" || pct > 0);
  return {
    key: tileKeyOf(PROJECT_SCOPE, "main"),
    scope: PROJECT_SCOPE,
    kind: "main",
    chip,
    price,
    uses,
    meter: shown ? { sold: pct, total: 100 } : null,
    soldLine: shown ? `${pct}% sold` : null,
    ...salesFacts(f.projectId, main),
    live,
    attention,
  };
}

/**
 * The product page's line under its Earn button (owner, 2026-11-18): this product's copies in a few
 * words — "Physical copies on sale · 3 sold", "Sold out · 50 sold", "Not selling copies yet". A
 * product sells copies only (selling-rules); in a one-product project the project's copies are that
 * product's (D3), so they count too. A copies listing signed while its videos render reads
 * "Copies wait for videos"; a project sold in full, "Sold in full".
 */
export function productCopiesLineOf(f: {
  productId: string;
  /** The project's only current product: the whole project's copies are its own. */
  onlyProduct: boolean;
  tracks: readonly EditionTrack[];
  sales: readonly Sale[];
  /** Sold in full: no copy sells any more. */
  locked: boolean;
  /** A copies listing of this product waits for its videos (lib/market/held.ts). */
  waiting: boolean;
}): string {
  if (f.locked) return "Sold in full";
  const mine = f.tracks.filter((t) => t.productId === f.productId || (f.onlyProduct && t.productId === PROJECT_SCOPE));
  const ids = new Set(mine.map((t) => t.id));
  const sold = f.sales.filter((s) => s.item.nft !== "main" && ids.has(s.item.trackId)).length;
  const soldPart = sold > 0 ? `${sold} sold` : null;
  const join = (lead: string) => (soldPart ? `${lead} · ${soldPart}` : lead);
  if (f.waiting) return join("Copies wait for videos");
  const live = mine.filter((t) => t.listing !== null && soldOf(t.id, [...f.sales]) < t.supply.total);
  const kinds = new Set(live.map((t) => t.kind));
  if (kinds.size === 2) return join("Physical and Virtual copies on sale");
  if (kinds.size === 1) return join(`${kinds.has("physical") ? "Physical" : "Virtual"} copies on sale`);
  if (mine.some((t) => t.listing !== null) && sold > 0) return join("Sold out");
  return sold > 0 ? `${sold} ${sold === 1 ? "copy" : "copies"} sold` : "Not selling copies yet";
}

/** D5: the tile open on arrival. A hash (`#copies`, `#editions-<product>`) asks for a product's copies. */
export function defaultTileOf(tiles: readonly DeskTile[], hash = ""): string | null {
  if (!tiles.length) return null;
  const want = hash.replace(/^#/, "");
  if (want === "copies" || want.startsWith("editions-")) {
    const product = want.startsWith("editions-") ? want.slice("editions-".length) : null;
    const scoped = tiles.filter((t) => t.kind !== "main" && (product ? t.scope === product : t.scope !== PROJECT_SCOPE));
    const pick = scoped.find((t) => t.chip.label !== "Can't sell") ?? scoped[0] ?? tiles.find((t) => t.kind !== "main");
    if (pick) return pick.key;
  }
  const waiting = [...tiles].filter((t) => t.attention > 0).sort((a, b) => b.attention - a.attention || (b.lastSaleAt ?? 0) - (a.lastSaleAt ?? 0));
  if (waiting.length) return waiting[0].key;
  const sold = [...tiles].filter((t) => t.lastSaleAt !== null).sort((a, b) => (b.lastSaleAt ?? 0) - (a.lastSaleAt ?? 0));
  if (sold.length) return sold[0].key;
  return (tiles.find((t) => t.kind === "main") ?? tiles[0]).key;
}

/** D6: the line over the board, in parts ("5 of 9 on sale", "1 sold out", "9 copies sold", "0.14139 ETH earned").
 *  Earned is every sale of the project, the Overview's own sum. */
export function deskCaptionOf(f: { projectId: string; tiles: readonly DeskTile[]; sales: readonly Sale[]; locked: boolean }): { value: string; label: string }[] {
  const earned = earnedOf([...f.sales], f.projectId);
  const earnedPart = { value: earned.length ? payoutLinesText(earned) : "Nothing", label: earned.length ? "earned" : "earned yet" };
  if (f.locked) return [{ value: "Sold in full", label: "" }, earnedPart];
  const live = f.tiles.filter((t) => t.live).length;
  const soldOut = f.tiles.filter((t) => t.chip.label === "Sold out").length;
  const copies = f.sales.filter((s) => s.projectId === f.projectId && s.item.nft !== "main").length;
  return [
    { value: `${live} of ${f.tiles.length}`, label: "on sale" },
    ...(soldOut ? [{ value: String(soldOut), label: "sold out" }] : []),
    { value: String(copies), label: copies === 1 ? "copy sold" : "copies sold" },
    earnedPart,
  ];
}

/** D3: the products that get a row. One current product and no copy tracks of its own: none — the
 *  project's row is that product. Otherwise every current product, and a dropped one with tracks. */
export function deskProductsOf<P extends { id: string; dropped: unknown }>(products: readonly P[], tracks: readonly EditionTrack[]): P[] {
  const current = products.filter((p) => p.dropped === null);
  const hasTracks = (p: P) => tracks.some((t) => t.productId === p.id);
  if (current.length === 1 && !products.some((p) => p.dropped !== null && hasTracks(p))) return current.filter(hasTracks);
  return products.filter((p) => p.dropped === null || hasTracks(p));
}

/** The panel's title: "Main NFT" is the project's name; copies say whose. */
export function deskTitleOf(kind: DeskKind, scopeName: string | null, projectName: string): string {
  if (kind === "main") return projectName;
  const word = kind === "physical" ? "Physical" : "Virtual";
  return `${word} copies of ${scopeName ?? "the whole project"}`;
}

/** What each kind holds, in a line: the item panel's and the drawer's head (the full rule cards are in "How selling works"). */
export const DESK_KIND_LINE: Record<DeskKind, string> = {
  main: "The project itself · whole project only",
  physical: "A built unit you make and ship",
  virtual: "The design files with a licence",
};

/** What each kind is, in a line on its tile (owner, 2026-11-18: testers could not tell the tiles apart,
 *  so each tile names its type and says what it is; "whole project only" is the board's shape). */
export const DESK_KIND_PLAIN: Record<DeskKind, string> = {
  main: "The project itself",
  physical: DESK_KIND_LINE.physical,
  virtual: DESK_KIND_LINE.virtual,
};

/** A product's Main slot: products have no Main NFT. The first product's slot says why, the rest only name it. */
export const NO_MAIN_TITLE = "No Main NFT";
export const NO_MAIN_WHY = "Products sell copies only. The Main NFT is the whole project, above.";
export const NO_MAIN_SHORT = "Copies only";

/** Where buyers see a tile: the project's marketplace page on that tab, or a product's page. */
export function marketHrefOf(projectId: string, scope: string, kind: DeskKind): string {
  const id = encodeURIComponent(projectId);
  if (scope === PROJECT_SCOPE) return `/marketplace/${id}?nft=${kind}`;
  return `/marketplace/${id}/products/${encodeURIComponent(scope)}`;
}
