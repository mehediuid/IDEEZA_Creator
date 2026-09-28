// The Customers derivation and its text (Phase 2 spec §3.5.6, T05): every
// completed Main or edition `Sale` (`../market/types`, T01) turned into
// display-ready rows, the disclosure's detail lines, the empty-state copy
// and the Sold status line (§3.2).
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { DemoBuyerId, MintType } from "../wallet/types";
import { buyerLabel } from "../wallet/identities";
import { formatAmount } from "../wallet/money";
import { feePercentText } from "../market/fee";
import type { EditionKind, EditionUse, Sale, UtilityBenefit } from "../market/types";
import { NETWORKS, type Network, type Token } from "../brief/types";
import { formatDate, formatDateTime, type ProjectStatus } from "./project-summary";
import type { ManualProject } from "./projects";

// The buyer's label ("Mira (demo buyer)") is the wallet identities' own
// (spec §3.5.3); re-exported so ownership.ts and the panels keep one import.
export { buyerLabel };

// ─────────────────────────── the derivation ───────────────────────────

export type CustomerScope = { kind: "project" } | { kind: "product"; productId: string };

export type CustomerRow = {
  saleId: string;
  at: number;
  buyerId: DemoBuyerId;
  buyerAddress: string;
  buyer: string; // buyerLabel(buyerId)
  item: Sale["item"];
  price: { amount: string; token: Token };
  payout: string;
  fees: Sale["fees"];
  via: Sale["via"];
  mint: MintType;
  mintedAtSale: boolean;
  network: Network;
  benefits: UtilityBenefit[];
};

export type Customers = {
  rows: CustomerRow[]; // newest first, within `scope`
  saleCount: number; // rows.length
  buyerCount: number; // distinct buyerId, within `scope`
  mainSale: CustomerRow | null; // latest Main sale, project-wide regardless of scope
  mainSaleCount: number; // every Main sale, project-wide
  soldSharePct: number; // Σ Main sharePct, project-wide — feeds CONTRIB's ownershipOf
};

type MainItem = Extract<Sale["item"], { nft: "main" }>;
const isMainSale = (s: Sale): s is Sale & { item: MainItem } => s.item.nft === "main";

function toCustomerRow(s: Sale): CustomerRow {
  return {
    saleId: s.id,
    at: s.at,
    buyerId: s.buyerId,
    buyerAddress: s.buyerAddress,
    buyer: buyerLabel(s.buyerId),
    item: s.item,
    price: { amount: s.price, token: s.token },
    payout: s.payout,
    fees: s.fees,
    via: s.via,
    mint: s.mint,
    mintedAtSale: s.mintedAtSale,
    network: s.network,
    benefits: s.benefits,
  };
}

/** Newest first; ties broken by `id` descending (CUSTOMERS-20 #2). */
function byNewest(a: Sale, b: Sale): number {
  if (a.at !== b.at) return b.at - a.at;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * `customersOf(project, sales, { scope })`: only `project.id`'s sales
 * (CUSTOMERS-20 #1), scoped to one product's editions when asked
 * (CUSTOMERS-20 #3) — Main sales never show on a product scope. Buyers are
 * counted by `buyerId` (P2-CUSTOMERS-2 (C)). `mainSale` / `mainSaleCount` /
 * `soldSharePct` stay project-wide so a product scope never loses the Sold
 * facts CONTRIB and the status line need.
 */
export function customersOf(
  project: ManualProject,
  sales: readonly Sale[],
  opts?: { scope?: CustomerScope },
): Customers {
  const scope = opts?.scope ?? { kind: "project" };
  const projectSales = sales.filter((s) => s.projectId === project.id);
  const mainSales = projectSales.filter(isMainSale);

  const scoped =
    scope.kind === "product"
      ? projectSales.filter((s) => s.item.nft !== "main" && s.item.productId === scope.productId)
      : projectSales;

  const rows = scoped.slice().sort(byNewest).map(toCustomerRow);
  const mainRows = mainSales.slice().sort(byNewest).map(toCustomerRow);

  return {
    rows,
    saleCount: rows.length,
    buyerCount: new Set(scoped.map((s) => s.buyerId)).size,
    mainSale: mainRows[0] ?? null,
    mainSaleCount: mainRows.length,
    soldSharePct: mainSales.reduce((sum, s) => sum + s.item.sharePct, 0),
  };
}

// ─────────────────────────── benefits (P2-CUSTOMERS-18) ───────────────────────────

export type BenefitState = { kind: "until"; until: number; active: boolean } | { kind: "whileHeld" };

/** Calendar-safe: Jan 31 + 1 month lands on Feb 28 (or 29 in a leap year). */
export function addMonths(at: number, months: number): number {
  const d = new Date(at);
  const day = d.getDate();
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDay));
  return first.getTime();
}

export function benefitStateOf(b: UtilityBenefit, soldAt: number, now: number): BenefitState {
  if ("whileHeld" in b.duration) return { kind: "whileHeld" };
  const until = addMonths(soldAt, b.duration.months);
  return { kind: "until", until, active: now < until };
}

export function benefitDurationText(d: UtilityBenefit["duration"]): string {
  if ("whileHeld" in d) return "For as long as they hold it";
  return d.months === 1 ? "1 month" : `${d.months} months`;
}

export const BENEFITS_NOTE = "IDEEZA records benefits with each sale. Giving buyers access is up to you for now.";

function benefitLine(b: UtilityBenefit, state: BenefitState): string {
  if (state.kind === "whileHeld") return `${b.name}, for as long as they hold it`;
  return state.active ? `${b.name}, active until ${formatDate(state.until)}` : `${b.name}, ended ${formatDate(state.until)}`;
}

// ─────────────────────────── row text (P2-CUSTOMERS-3, -8) ───────────────────────────

const EDITION_WORD: Record<EditionKind, string> = { physical: "Physical", virtual: "Virtual" };
const USE_WORD: Record<EditionUse, string> = { commercial: "Commercial use", private: "Private use" };
const TIER_WORD: Record<"regular" | "extended", string> = { regular: "Regular", extended: "Extended" };
const TIER_BOUGHT_TEXT: Record<"regular" | "extended", string> = {
  extended: "Extended (includes future versions)",
  regular: "Regular (this version only)",
};
const VIA_TEXT: Record<Sale["via"], string> = {
  buyNow: "Buy now",
  auctionBuyNow: "Buy now",
  auctionWin: "Winning auction bid",
};

function networkLabel(n: Network): string {
  return NETWORKS.find((x) => x.value === n)?.label ?? n;
}

export type CustomerRowText = {
  buyer: string;
  item: string;
  itemSub: string | null;
  price: string;
  priceSub: string | null; // "{payout} to you" (P2-CUSTOMERS-3 (C))
  share: string | null; // "10%" | null → "—"
  benefits: string | null; // "2 benefits" | null → "—"
  detail: { term: string; value: string }[]; // the disclosure's <dl> (P2-CUSTOMERS-8, (C) fee/payout rows)
};

/** No display string is joined in JSX — every word here (P2-CUSTOMERS-3, -8). */
export function customerRowText(row: CustomerRow, ctx: { projectName: string; now: number }): CustomerRowText {
  const saleItem = row.item;
  let item: string;
  let itemSub: string | null;
  let share: string | null;
  let bought: string;
  if (saleItem.nft === "main") {
    item = "Main NFT";
    itemSub = null;
    share = `${saleItem.sharePct}%`;
    bought = `Main NFT: ${saleItem.sharePct}% of ${ctx.projectName}`;
  } else {
    item = `${saleItem.productName} · ${EDITION_WORD[saleItem.nft]}`;
    itemSub = `${USE_WORD[saleItem.use]} · ${TIER_WORD[saleItem.tier]}`;
    share = null;
    bought = `${saleItem.productName} · ${EDITION_WORD[saleItem.nft]} NFT · ${USE_WORD[saleItem.use]} · ${TIER_BOUGHT_TEXT[saleItem.tier]}`;
  }
  const priceText = formatAmount(row.price.amount, row.price.token);
  const priceSub = `${formatAmount(row.payout, row.price.token)} to you`;
  const benefits = row.benefits.length ? `${row.benefits.length} benefit${row.benefits.length === 1 ? "" : "s"}` : null;

  const detail: { term: string; value: string }[] = [
    { term: "Wallet", value: row.buyerAddress },
    { term: "Bought", value: bought },
    { term: "Paid", value: `${priceText} · ${VIA_TEXT[row.via]}` },
    { term: "IDEEZA fee", value: `${feePercentText(row.fees.ideezaBps)} · ${formatAmount(row.fees.ideeza, row.price.token)}` },
    { term: "You received", value: formatAmount(row.payout, row.price.token) },
    { term: "When", value: formatDateTime(row.at) },
    { term: "Minted", value: row.mint === "lazy" ? "When bought (lazy mint)" : "Before listing (instant mint)" },
    { term: "Network", value: networkLabel(row.network) },
  ];
  if (row.benefits.length) {
    for (const b of row.benefits) detail.push({ term: "Benefits", value: benefitLine(b, benefitStateOf(b, row.at, ctx.now)) });
    detail.push({ term: "Benefits", value: BENEFITS_NOTE });
  }

  return { buyer: row.buyer, item, itemSub, price: priceText, priceSub, share, benefits, detail };
}

// ─────────────────────────── summary and empty copy ───────────────────────────

export function customersSummaryText(c: Customers): string {
  const sales = c.saleCount === 1 ? "1 sale" : `${c.saleCount} sales`;
  const buyers = c.buyerCount === 1 ? "1 buyer" : `${c.buyerCount} buyers`;
  return `${sales} to ${buyers}.`;
}

export function customersEmptyCopy(ctx: {
  scope: CustomerScope;
  status: ProjectStatus;
  projectId: string;
  productName?: string;
}): { title: string; body: string; link?: { label: string; href: string } } {
  if (ctx.scope.kind === "product") {
    return {
      title: "No customers for this product yet",
      body: `People who buy ${ctx.productName ?? "this product"}'s physical or virtual NFTs show up here. Main NFT sales are on the project's Customers tab.`,
      link: { label: "Project customers", href: `/projects/${ctx.projectId}?tab=customers` },
    };
  }
  if (ctx.status === "given") {
    return { title: "No customers", body: "This project is given to the community for free, so nobody buys it." };
  }
  if (ctx.status === "listed") {
    return { title: "No customers yet", body: "When someone buys this project's NFT on Explore marketplace, they show up here." };
  }
  return {
    title: "No customers yet",
    body: "Customers come from marketplace sales. Once this project is listed and someone buys it, they show up here.",
  };
}

export const CUSTOMERS_PAGE_SIZE = 10;

/** 1-based; an unknown or null id gives page 1. */
export function pageOfSale(rows: readonly CustomerRow[], saleId: string | null): number {
  if (!saleId) return 1;
  const idx = rows.findIndex((r) => r.saleId === saleId);
  return idx === -1 ? 1 : Math.floor(idx / CUSTOMERS_PAGE_SIZE) + 1;
}

// ─────────────────────────── the Sold line (§3.2, P2-CUSTOMERS-12 (C)) ───────────────────────────

/** Parts, so the header can link the buyer name; `joinSoldLine` gives the
 *  My projects card's plain string. */
export type SoldLine = { before: string; buyer: { label: string; saleId: string } | null; after: string };

export function joinSoldLine(line: SoldLine): string {
  return `${line.before}${line.buyer?.label ?? ""}${line.after}`;
}

/**
 * The status line's sold phrase (§3.2's table): one sale reads its percent
 * and buyer, a 100 % sale drops the percent, several sales roll up to a
 * total and a count, and a visitor never learns who or how much.
 */
export function soldLineOf(
  customers: Pick<Customers, "mainSale" | "mainSaleCount" | "soldSharePct">,
  audience: "owner" | "visitor",
  date: (at: number) => string,
): SoldLine | null {
  const { mainSale, mainSaleCount, soldSharePct } = customers;
  if (!mainSale || mainSaleCount === 0) return null;
  if (audience === "visitor") return { before: "Sold", buyer: null, after: ` · ${date(mainSale.at)}` };
  if (mainSaleCount > 1) {
    return { before: `Sold ${soldSharePct}% in ${mainSaleCount} sales`, buyer: null, after: ` · last ${date(mainSale.at)}` };
  }
  const pct = mainSale.item.nft === "main" ? mainSale.item.sharePct : 0;
  const before = pct >= 100 ? "Sold to " : `Sold ${pct}% to `;
  return { before, buyer: { label: mainSale.buyer, saleId: mainSale.saleId }, after: ` · ${date(mainSale.at)}` };
}
