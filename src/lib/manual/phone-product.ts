// The phone's product page (mobile Figma "Product Details · 2026 update"
// 10459:3): what the coded prototype at /m adds to the web's product page
// logic (product-page.ts, product-tabs.tsx), and nothing the web already
// decides. The web's derivation, words and gates stay theirs; this keeps the
// phone's own IA:
// - the tabs: the owner's Overview · Build · Media (the web's piece tabs are
//   one Build list on a phone); a buyer's Media · Overview · Build ·
//   Contributors (Media first, as on the web's buyer side, D1);
// - the Build list: one row per piece in the build's own order, each in its
//   state (Ready, Failed, Building, Waiting, Not built), with the line under
//   its name;
// - each piece's own screen (`…/build/<piece>`), and the query a link keeps
//   (`?view=` and `?as=` for a preview or the marketplace, `?v=` for a
//   version);
// - the sticky buy bar's "Copies from", and a product's prices in an
//   activity entry's snapshot (26a–26c).
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import type { BuildItem, BuildItemKind } from "../create/history";
import { PIECES, creditsLabel, isLeftOut, pieceCost, pieceSeconds } from "../create/pieces";
import type { PriceSnapshot } from "./journey";

const enc = encodeURIComponent;

// ─────────────────────────── the tabs ───────────────────────────

export type ProductTab = "overview" | "build" | "media" | "contributors";
export type ProductTabDef = { id: ProductTab; label: string };

const LABEL: Record<ProductTab, string> = { overview: "Overview", build: "Build", media: "Media", contributors: "Contributors" };

/**
 * The page's tabs. The owner (and a contributor preview) reads Overview · Build · Media (10–10f).
 * A buyer — the marketplace's demo buyer, the owner's preview as others see it, a Feed sample —
 * opens on Media (D1) and has Contributors when the web's gate shows the team (10h, 10x–10z).
 * A product no build stands behind has one panel and no strip (10t): `[]`.
 */
export function productTabsOf(input: { buyer: boolean; built: boolean; contributors: boolean }): ProductTabDef[] {
  if (!input.built && !input.buyer) return [];
  const ids: ProductTab[] = input.buyer
    ? ["media", "overview", ...(input.built ? (["build"] as const) : []), ...(input.contributors ? (["contributors"] as const) : [])]
    : ["overview", "build", "media"];
  return ids.map((id) => ({ id, label: LABEL[id] }));
}

/** `?tab=` as the page reads it: the Feed's `marketplace` is the Overview (where the Marketplace
 *  block is); anything the strip doesn't have is its first tab. */
export function parseProductTab(raw: string | null | undefined, tabs: readonly ProductTabDef[]): ProductTab | null {
  if (!tabs.length) return null;
  if (raw === "marketplace" && tabs.some((t) => t.id === "overview")) return "overview";
  return tabs.some((t) => t.id === raw) ? (raw as ProductTab) : tabs[0].id;
}

// ─────────────────────────── addresses ───────────────────────────

/** The query keys a link inside the product keeps: who is looking and which version. */
const KEPT = ["view", "as", "v"] as const;

/** `?view=…&as=…&v=…` from the page's query, the rest dropped; "" when none. `patch` sets or
 *  (null) removes keys on top. */
export function keptQuery(search: string, patch: Record<string, string | null> = {}): string {
  const from = new URLSearchParams(search);
  const q = new URLSearchParams();
  for (const k of KEPT) {
    const v = from.get(k);
    if (v !== null) q.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** The phone's product page, or a screen under it (`build/pcb`, `activity`, `video`, …). */
export function phoneProductPath(projectId: string, productId: string, rest = ""): string {
  return `/m/projects/${enc(projectId)}/products/${enc(productId)}${rest ? `/${rest}` : ""}`;
}

/** `?view=market` reads the page as Explore marketplace's demo buyer (the web's
 *  `/marketplace/[id]/products/[productId]`); `?view=buyer` and `?view=contributor&as=` are the
 *  web's previews, read by `viewerFromParams`. */
export const MARKET_VIEW = "market";

// ─────────────────────────── the pieces (10b, 10n) ───────────────────────────

/** The build's own order (history.ts ITEM_KINDS). */
export const PIECE_ORDER: readonly BuildItemKind[] = ["pcb", "code", "3d", "assembly", "wiring", "parts"];

export type PieceState = "ready" | "failed" | "building" | "waiting" | "notBuilt";

export type PieceRow = { kind: BuildItemKind; state: PieceState; progress: number };

export const PIECE_BADGE: Record<PieceState, string> = {
  ready: "Ready",
  failed: "Failed",
  building: "Building",
  waiting: "Waiting",
  notBuilt: "Not built",
};

/** `…/build/<piece>` → the piece; anything else → null. */
export function parsePiece(raw: string | null | undefined): BuildItemKind | null {
  return PIECE_ORDER.includes(raw as BuildItemKind) ? (raw as BuildItemKind) : null;
}

function stateOf(item: BuildItem): PieceState | null {
  if (isLeftOut(item)) return "notBuilt";
  switch (item.status) {
    case "ready":
      return "ready";
    case "failed":
      return "failed";
    case "building":
      return "building";
    case "pending":
      return "waiting";
    default:
      // `skipped` without `omitted`: a piece an older build never had — it shows nowhere.
      return null;
  }
}

/**
 * The Build list's rows, in the build's order. A piece the build never had shows nowhere; one the
 * maker left out is "Not built" (the owner can add it). `firmware` false leaves Code out — the web's
 * O12: no firmware source before a purchase (10y). `leftOut` false leaves the Not built rows out:
 * they are the maker's to add, so only an owner who can still build reads them (the web's
 * product-tabs `leftOut: owner`).
 */
export function pieceRowsOf(items: readonly BuildItem[], opts: { firmware: boolean; leftOut?: boolean }): PieceRow[] {
  const out: PieceRow[] = [];
  for (const kind of PIECE_ORDER) {
    if (kind === "code" && !opts.firmware) continue;
    const item = items.find((i) => i.kind === kind);
    if (!item) continue;
    const state = stateOf(item);
    if (state === "notBuilt" && opts.leftOut === false) continue;
    if (state) out.push({ kind, state, progress: Math.round(item.progress) });
  }
  return out;
}

/** What a ready piece is, in one line: the facts each one is made from. */
export type PieceFacts = { board: string; mcu: string | null; parts: number };

/**
 * The line under a piece's name (10b, 10n): what a ready piece is, the web's words for one that
 * isn't (product-deliverables.tsx PieceNotReady), and a left-out piece's price to add it.
 * `chat` says whether there is a chat to retry a failed piece in.
 */
export function pieceLineOf(row: PieceRow, facts: PieceFacts, opts: { chat: boolean }): string {
  switch (row.state) {
    case "failed":
      return `This piece failed in this build.${opts.chat ? " Retry it in the chat." : ""}`;
    case "building":
      return `This piece is still being built — ${row.progress}%.`;
    case "waiting":
      return "This piece is waiting to be built.";
    case "notBuilt":
      return `Not built · ${creditsLabel(pieceCost(row.kind, PLAIN))} to add`;
    case "ready":
      break;
  }
  switch (row.kind) {
    case "pcb":
      return facts.board;
    case "code":
      return facts.mcu ? `Firmware for the ${facts.mcu}` : "No microcontroller — nothing runs firmware";
    case "3d":
      return "Enclosure and parts in 3D";
    case "assembly":
      return "How the pieces fit together";
    case "wiring":
      return "Wires between the boards";
    case "parts":
      return `${facts.parts} ${facts.parts === 1 ? "part" : "parts"} · bill of materials`;
  }
}

const PLAIN = { quality: "medium" as const, optimize: false };

/** "about 30 s", "about 1 min 15 s" — one piece's time, in the Figma's word (10p, 33a). */
export function aboutPieceTime(seconds: number): string {
  if (seconds < 60) return `about ${seconds} s`;
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return `about ${m} min${r ? ` ${r} s` : ""}`;
}

/** 33a: "1 credit · about 30 s at Medium" — a left-out piece's price and time (NotBuiltPanel). */
export function notBuiltCostLine(kind: BuildItemKind): string {
  return `${creditsLabel(pieceCost(kind, PLAIN))} · ${aboutPieceTime(pieceSeconds(kind, PLAIN))} at Medium`;
}

/** 33a's title: "3D Module isn't built yet". */
export function notBuiltTitle(kind: BuildItemKind): string {
  return `${PIECES[kind].name} isn’t built yet`;
}

/** 10p's "It has a PCB, code, wiring and parts.": the pieces that are ready, in the sentence's
 *  own lower-case words (PCB and 3D keep their capitals). "" when none is ready yet. */
export function hasPiecesLine(items: readonly BuildItem[]): string {
  const word: Record<BuildItemKind, string> = { pcb: "PCB", code: "code", "3d": "3D module", assembly: "assembly", wiring: "wiring", parts: "parts" };
  const ready = PIECE_ORDER.filter((k) => items.some((i) => i.kind === k && i.status === "ready")).map((k) => word[k]);
  if (!ready.length) return "";
  const list = ready.length < 2 ? ready[0] : `${ready.slice(0, -1).join(", ")} and ${ready[ready.length - 1]}`;
  // "parts" is the one plural: "It has a PCB…", "It has parts."
  return `It has ${ready[0] === "parts" ? "" : "a "}${list}.`;
}

/**
 * A product typed by hand (the project page's Add a product › Build manually): its row has no build
 * source and a new-style id (`prd_…`; a legacy build row is `p<n>`). On a project a build created,
 * the web's read calls such a row "unmatched" ("Its build can't be matched to this name."), which
 * isn't true of it — the phone says "Made by hand…" (10t).
 */
export function madeByHand(state: string, row: { id: string; source?: unknown } | null | undefined): boolean {
  if (state === "hand") return true;
  return state === "unmatched" && !!row && !row.source && row.id.startsWith("prd_");
}

/** The header's "2 of 6 pieces ready" (web: productPiecesOf), or "All 6 pieces ready". */
export function piecesLine(p: { ready: number; total: number }): string {
  return p.ready === p.total ? `All ${p.total} pieces ready` : `${p.ready} of ${p.total} pieces ready`;
}

// ─────────────────────────── buying a copy (10h, 23a) ───────────────────────────

// A copy track as these readers need it: lib/market's EditionTrack, said here by shape so
// engineering imports no commerce (Build and Earn P1-1).
type CopyKind = "physical" | "virtual";
type CopyUse = "private" | "commercial";
type CopyTrack = { kind: CopyKind; use: CopyUse; listing: null | { token: string; regular: string; extended: string } };

/**
 * The sticky bar's "Copies from": the lowest price of this product's copies a buyer can buy now
 * (listed, not sold out). Copies in another token than the cheapest one's aren't compared — there
 * is no rate between test tokens — so the first token by price wins. Null when none is on sale.
 */
export function copiesFromOf<K extends CopyTrack>(
  tracks: readonly K[],
  soldOut: (t: K) => boolean,
): { amount: string; token: NonNullable<K["listing"]>["token"] } | null {
  // A track's lowest price is "This version" (regular), the web's offer card's first.
  let best: { amount: string; token: NonNullable<K["listing"]>["token"] } | null = null;
  for (const t of tracks) {
    const l = t.listing as NonNullable<K["listing"]> | null;
    if (!l || soldOut(t)) continue;
    if (!best || Number(l.regular) < Number(best.amount)) best = { amount: l.regular, token: l.token };
  }
  return best;
}

/** The order a buyer meets copies in (23a): Virtual before Physical — the cheaper digital twin
 *  first, as the Figma lists them — then Personal before Business use. */
export function copyOrder(a: Pick<CopyTrack, "kind" | "use">, b: Pick<CopyTrack, "kind" | "use">): number {
  const kind: Record<CopyKind, number> = { virtual: 0, physical: 1 };
  const use: Record<CopyUse, number> = { private: 0, commercial: 1 };
  return kind[a.kind] - kind[b.kind] || use[a.use] - use[b.use];
}

// ─────────────────────────── an activity entry's prices (26a–26c) ───────────────────────────

export type ProductPrices = {
  kind: CopyKind;
  /** The lowest of the kind's Regular and Extended prices: "Physical from 0.05 ETH". */
  from: string;
  rows: { use: CopyUse; regular: string; extended: string }[];
};

/** This product's Physical and Virtual prices in an entry's snapshot, each kind once with its
 *  lowest price; [] when the entry was added while none of its copies was listed. */
export function productPricesOf(pricing: PriceSnapshot | undefined, productId: string): ProductPrices[] {
  if (!pricing) return [];
  const out: ProductPrices[] = [];
  for (const kind of ["physical", "virtual"] as const) {
    const rows = pricing.editions.filter((e) => e.productId === productId && e.kind === kind);
    const nums = rows.flatMap((r) => [r.regular, r.extended]).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (!rows.length || !nums.length) continue;
    out.push({
      kind,
      from: String(Math.min(...nums)),
      rows: rows
        .slice()
        .sort((a, b) => (a.use === b.use ? 0 : a.use === "private" ? -1 : 1))
        .map((r) => ({ use: r.use, regular: r.regular, extended: r.extended })),
    });
  }
  return out;
}

// ─────────────────────────── the version select (10e, 28) ───────────────────────────

/** One row of the version sheet: "Version 2 of 2" and the web's sub line
 *  (product-version.tsx): "{date} · current", "not in this version", "build not in this browser". */
export function versionRowsOf(
  options: readonly { n: number; current: boolean; has: boolean; gone: boolean; at: number | null }[],
  formatDate: (at: number) => string,
): { n: number; label: string; sub: string }[] {
  const count = options.length;
  return [...options].reverse().map((o) => ({
    n: o.n,
    label: `Version ${o.n} of ${count}`,
    sub: [o.at !== null ? formatDate(o.at) : null, o.current ? "current" : null, o.gone ? "build not in this browser" : o.has ? null : "not in this version"]
      .filter(Boolean)
      .join(" · "),
  }));
}
