// What a buyer holds, project by project (owner, 2026-11-16: "anything bought goes to My projects — how many
// copies, the permission; for a Virtual NFT, how many, everything"). My projects' Purchased tab and the
// purchased page read it.
//
// Two sources, one shape:
// - this browser's own listings, bought by a demo creator (the market store's `Sale` records: the Main NFT's
//   share, or one copy of a Physical / Virtual track, each with its use and serial);
// - another creator's samples (the phone's sample store, sample-market.ts).
// A project's purchases fold into lines — one per kind × use × scope (the whole project, or one product's own
// copies) — each with its copies (serial, of how many, price, when, transaction) and what that use allows.
//
// A copy is the holder's now (resales.ts): whoever bought it last, from its creator or from another holder. A copy
// the buyer sold on leaves their lines and stays in `sold`, so the project and what it earned stay in My projects.
//
// The use rules are the prototype's defaults until the owner words them (decision open).
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { Network, Token } from "../brief/types";
import { LOCKED } from "../innovations/locked-pieces";
import { addAmounts } from "../wallet/money";
import { ownCopyKeyOf, sampleCopyKeyOf, unitsAllowanceOf } from "./units";
import { boughtOnOf, buyerNameOf as holderNameOf, chainOf, holderOf, liveListingOf, soldByOf, type Resale, type ResaleDraft, type ResaleSale } from "./resales";
import { DEMO_BUYERS } from "../wallet/identities";
import { ACQUIRED_PREFIX } from "../demo/acquired-projects";
import type { Amount, DemoBuyerId } from "../wallet/types";
import type { SampleSale } from "./phone-sample-sales";
import { copyUseBlockOf, copyUsesOf, SAMPLE_COLLECTION, sampleCoverOf, SAMPLE_MARKETS, type SampleUse } from "./sample-market";
import { PROJECT_SCOPE, type EditionKind, type EditionTrack, type EditionUse, type Sale } from "./types";

export type PurchaseKind = "main" | EditionKind;
export type PurchaseUse = SampleUse;

export const USE_OF: Record<EditionUse, PurchaseUse> = { private: "Personal use", commercial: "Business use" };
export const KIND_NAME: Record<PurchaseKind, string> = { main: "Whole project", physical: "Physical NFT", virtual: "Virtual NFT" };

/** What each use allows and doesn't: one copy is one licence. The prototype's words until the owner sets them
 *  (plan 6rPKBgwzQ6r6woYmjfE6Td, D3 + D4). */
export type Licence = { can: string[]; cant: string[] };

export const LICENCE: Record<EditionKind, Record<PurchaseUse, Licence>> = {
  physical: {
    "Personal use": {
      can: ["Make the units each copy allows, for yourself", "Change them for your own use", "Sell the copy; the units left go with it"],
      cant: ["Sell what you make", "Share the files", "Make more units than the copy has left"],
    },
    "Business use": {
      can: ["Make and sell the units each copy allows", "Put your brand on the units", "Sell the copy; the units left go with it"],
      cant: ["Sell or share the files themselves", "Make more units than the copy has left"],
    },
  },
  virtual: {
    "Personal use": {
      can: ["Use the model and renders in your own work", "Show it in your portfolio", "Sell the copy; the licence goes with it"],
      cant: ["Use it in ads or paid work", "Share or sell the model file", "Start new work with it after you sell the copy"],
    },
    "Business use": {
      can: ["Use it in ads, games, product pages and client work", "Sell the copy; the licence goes with it"],
      cant: ["Sell or share the model file itself", "Start new work with it after you sell the copy"],
    },
  },
};

/** What a Main NFT gives, by the share held. */
export function mainLicenceOf(sharePct: number): Licence {
  return sharePct >= 100
    ? { can: ["Open, edit and build the project like your own", "List it again, sell its copies and earn its royalties"], cant: [] }
    : { can: [`Earn ${sharePct}% of the project's sales and royalties`], cant: ["List or change the project on your own"] };
}

/** One file a purchase gives: what it is, its format, what is inside. */
export type PurchaseFile = { id: string; name: string; format: string; includes: string[] };

const PHYSICAL_FILES: PurchaseFile[] = [
  { id: "pcb", name: LOCKED.pcb.name, format: "Gerber · CSV", includes: LOCKED.pcb.includes },
  { id: "code", name: LOCKED.code.name, format: "Source code", includes: LOCKED.code.includes },
  { id: "wiring", name: LOCKED.wiring.name, format: "PDF · CSV", includes: LOCKED.wiring.includes },
  { id: "enclosure", name: "Enclosure", format: "STEP · STL", includes: ["The case, ready to print or machine"] },
  { id: "assembly", name: "Assembly guide", format: "PDF", includes: ["How the board, parts and case go together"] },
];
const VIRTUAL_FILES: PurchaseFile[] = [
  { id: "model", name: "3D model", format: "GLB", includes: ["The product's 3D model"] },
  { id: "renders", name: "Preview renders", format: "PNG", includes: ["Pictures of the product, ready to use"] },
];

/** What each kind unlocks, as files (plan D2): Physical builds it, Virtual is its digital twin, Main is all of it. */
export const FILES_OF: Record<PurchaseKind, PurchaseFile[]> = {
  main: [
    { id: "project", name: "Every piece of the project", format: "All", includes: ["PCB, firmware, wiring, 3D and parts of every product"] },
    ...PHYSICAL_FILES,
    ...VIRTUAL_FILES,
  ],
  physical: PHYSICAL_FILES,
  virtual: VIRTUAL_FILES,
};

export type PurchaseCopy = {
  id: string;
  /** A copy's number; null for the Main NFT. */
  serial: number | null;
  /** Of how many copies, when the listing says. */
  of: number | null;
  price: Amount;
  token: Token;
  at: number;
  txHash: string;
  network: Network;
  collection: string;
  /** The Main NFT's token; null for a copy (minted when bought, it is known by its number). */
  tokenId: number | null;
  /** The wallet it went to. */
  buyerAddress: string;
  /** The copy's key, the same after it is sold again (units.ts); the Main NFT's is its sale's id. */
  key: string;
  /** Bought from another holder: their name; null when bought from the creator. */
  from: string | null;
  /** Its live listing, when the holder put it up for sale. */
  listing: { id: string; price: Amount; token: Token; listedAt: number } | null;
};

/** A copy the buyer sold on: what it was, who bought it, what the price paid them. */
export type SoldCopy = {
  id: string;
  kind: EditionKind;
  use: PurchaseUse;
  product: string | null;
  serial: number;
  of: number | null;
  price: Amount;
  token: Token;
  network: Network;
  at: number;
  to: string;
  royaltyPct: number;
  royalty: Amount;
  fee: Amount;
  payout: Amount;
  unitsLeft: number | null;
  txHash: string;
  copyKey: string;
  /** How the buyer had got it: from its creator, or from another holder. */
  bought: { price: Amount; token: Token; at: number; from: string } | null;
};

type FirstSale = { buyer: DemoBuyerId; price: Amount; token: Token; at: number };

export type PurchaseLine = {
  kind: PurchaseKind;
  /** Null for the Main NFT. */
  use: PurchaseUse | null;
  /** A product's own copies name the product; null for the whole project. */
  product: string | null;
  /** The Main NFT's share, summed over its sales. */
  sharePct: number | null;
  copies: PurchaseCopy[];
  /** Paid, per token: "0.08 ETH". */
  paid: { amount: Amount; token: Token }[];
  /** A Physical copy's units allowance (units.ts); null for Virtual copies and the Main NFT. */
  unitsPerCopy: number | null;
};

export type PurchasedProject = {
  /** This browser's project id, or a sample's feed id. */
  id: string;
  source: "own" | "sample";
  name: string;
  cover: string | null;
  creator: string;
  /** Its marketplace page. */
  marketHref: string;
  /** Its products' names, in order: a project of several shows them on its card. */
  products: string[];
  lines: PurchaseLine[];
  /** How many NFTs: each copy, and the Main NFT once. */
  count: number;
  lastAt: number;
  /** The copy kinds still on sale, so "Buy another" can lead there. */
  buyable: EditionKind[];
  /** The project's Main NFT went to someone else: the copies stay the buyer's. */
  soldInFullTo: string | null;
  /** The copies the buyer sold on, newest first. */
  sold: SoldCopy[];
  /** How many of the copies held are for sale now. */
  forSale: number;
};

const KIND_ORDER: PurchaseKind[] = ["main", "physical", "virtual"];
const USE_ORDER: (PurchaseUse | null)[] = [null, "Personal use", "Business use"];

type Draft = Omit<PurchaseLine, "paid" | "unitsPerCopy">;

function finish(lines: Map<string, Draft>): PurchaseLine[] {
  return [...lines.values()]
    .map((l) => {
      const byToken = new Map<Token, Amount>();
      for (const c of l.copies) byToken.set(c.token, byToken.has(c.token) ? addAmounts(byToken.get(c.token) as Amount, c.price) : c.price);
      return {
        ...l,
        copies: [...l.copies].sort((a, b) => a.at - b.at),
        paid: [...byToken].map(([token, amount]) => ({ amount, token })),
        unitsPerCopy: l.kind === "physical" ? unitsAllowanceOf(l.use) : null,
      };
    })
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        Number(a.product !== null) - Number(b.product !== null) ||
        (a.product ?? "").localeCompare(b.product ?? "") ||
        USE_ORDER.indexOf(a.use) - USE_ORDER.indexOf(b.use),
    );
}

function add(lines: Map<string, Draft>, kind: PurchaseKind, use: PurchaseUse | null, product: string | null, copy: PurchaseCopy, sharePct = 0) {
  const key = `${kind}|${use ?? ""}|${product ?? ""}`;
  const line = lines.get(key) ?? { kind, use, product, sharePct: kind === "main" ? 0 : null, copies: [] };
  line.copies.push(copy);
  if (kind === "main") line.sharePct = (line.sharePct ?? 0) + sharePct;
  lines.set(key, line);
}

function projectOf(base: Omit<PurchasedProject, "lines" | "count" | "lastAt" | "forSale">, lines: Map<string, Draft>): PurchasedProject {
  const done = finish(lines);
  const all = done.flatMap((l) => l.copies);
  return {
    ...base,
    lines: done,
    count: done.reduce((n, l) => n + (l.kind === "main" ? 1 : l.copies.length), 0),
    lastAt: Math.max(...all.map((c) => c.at), ...base.sold.map((s) => s.at)),
    forSale: all.filter((c) => c.listing !== null).length,
  };
}

/** The copy as the buyer holds it now, or null when it is someone else's: from its creator, or from a holder. */
function asHeld(copy: PurchaseCopy, firstBuyer: DemoBuyerId, buyerId: DemoBuyerId, resales: readonly Resale[]): PurchaseCopy | null {
  if (holderOf(copy.key, firstBuyer, resales) !== buyerId) return null;
  const on = boughtOnOf(copy.key, buyerId, resales);
  const live = liveListingOf(copy.key, buyerId, resales);
  const listing = live ? { id: live.id, price: live.price, token: live.token, listedAt: live.updatedAt } : null;
  if (!on) return { ...copy, listing };
  const sale = on.sale as ResaleSale;
  return { ...copy, id: on.id, price: on.price, token: on.token, at: sale.at, txHash: sale.txHash, buyerAddress: sale.buyerAddress, from: holderNameOf(on.sellerId), listing };
}

/** What the buyer sold on of one project; `firsts` (by copy key) says what its first buyer paid the creator. */
function soldOf(buyerId: DemoBuyerId, projectId: string, resales: readonly Resale[], firsts: ReadonlyMap<string, FirstSale>, creator: string): SoldCopy[] {
  return soldByOf(buyerId, resales, projectId).map((r) => {
    const s = r.sale as ResaleSale;
    // The sale on that handed it to the seller, else its first sale when the seller bought it from the creator.
    const before = chainOf(r.copyKey, resales).filter((x) => (x.sale as ResaleSale).at < s.at && (x.sale as ResaleSale).buyerId === buyerId).at(-1);
    const first = firsts.get(r.copyKey);
    const bought = before
      ? { price: before.price, token: before.token, at: (before.sale as ResaleSale).at, from: holderNameOf(before.sellerId) }
      : first && first.buyer === buyerId
        ? { price: first.price, token: first.token, at: first.at, from: creator }
        : null;
    return {
      id: r.id,
      kind: r.kind,
      use: r.use,
      product: r.product,
      serial: r.serial,
      of: r.of,
      price: r.price,
      token: r.token,
      network: r.network,
      at: s.at,
      to: holderNameOf(s.buyerId),
      royaltyPct: r.royaltyPct,
      royalty: s.royalty,
      fee: s.fee,
      payout: s.payout,
      unitsLeft: s.unitsLeft,
      txHash: s.txHash,
      copyKey: r.copyKey,
      bought,
    };
  });
}

/** The buyer's purchases of this browser's own listings, one entry per project. */
export function ownPurchasesOf(
  sales: readonly Sale[],
  buyerId: DemoBuyerId,
  projects: readonly { id: string; name: string; cover: string | null; products?: readonly string[] }[],
  tracks: readonly EditionTrack[],
  creator: string,
  resales: readonly Resale[] = [],
): PurchasedProject[] {
  const byProject = new Map<string, Map<string, Draft>>();
  const firsts = new Map<string, FirstSale>();
  for (const s of sales) {
    const key = s.item.nft === "main" ? null : ownCopyKeyOf(s.projectId, s.item.trackId, s.item.serial);
    if (key) firsts.set(key, { buyer: s.buyerId, price: s.price, token: s.token, at: s.at });
  }
  for (const id of new Set(resales.filter((r) => r.source === "own" && r.sellerId === buyerId && r.status === "sold").map((r) => r.projectId))) byProject.set(id, new Map());
  for (const s of sales) {
    // A copy may be the buyer's from another holder; the Main NFT only from its sale.
    if (s.buyerId !== buyerId && s.item.nft === "main") continue;
    const lines = byProject.get(s.projectId) ?? new Map<string, Draft>();
    const copy: PurchaseCopy = {
      id: s.id,
      serial: null,
      of: null,
      price: s.price,
      token: s.token,
      at: s.at,
      txHash: s.txHash,
      network: s.network,
      collection: s.collection,
      tokenId: s.item.nft === "main" ? s.tokenId : null,
      buyerAddress: s.buyerAddress,
      key: s.item.nft === "main" ? s.id : ownCopyKeyOf(s.projectId, s.item.trackId, s.item.serial),
      from: null,
      listing: null,
    };
    if (s.item.nft === "main") add(lines, "main", null, null, copy, s.item.sharePct);
    else {
      const it = s.item;
      const track = tracks.find((t) => t.id === it.trackId);
      const held = asHeld({ ...copy, serial: it.serial, of: track?.supply.total ?? null }, s.buyerId, buyerId, resales);
      if (!held) continue;
      add(lines, it.nft, USE_OF[it.use], it.productId === PROJECT_SCOPE ? null : it.productName, held);
    }
    byProject.set(s.projectId, lines);
  }
  const out: PurchasedProject[] = [];
  for (const [id, lines] of byProject) {
    const p = projects.find((x) => x.id === id);
    if (!p) continue;
    const mainTo = sales.find((x) => x.projectId === id && x.item.nft === "main" && x.buyerId !== buyerId)?.buyerId ?? null;
    const buyable = (["physical", "virtual"] as EditionKind[]).filter((k) =>
      tracks.some((t) => {
        if (t.projectId !== id || t.kind !== k || !t.listing) return false;
        const sold = sales.filter((x) => x.item.nft !== "main" && x.item.trackId === t.id).length;
        return sold < t.supply.total;
      }),
    );
    out.push(
      projectOf(
        {
          id,
          source: "own",
          name: p.name,
          cover: p.cover,
          creator,
          marketHref: `/marketplace/${id}`,
          products: [...(p.products ?? [])],
          buyable: mainTo ? [] : buyable,
          soldInFullTo: mainTo ? buyerNameOf(mainTo) : null,
          sold: soldOf(buyerId, id, resales, firsts, creator),
        },
        lines,
      ),
    );
  }
  return out.filter((p) => p.lines.length > 0 || p.sold.length > 0);
}

/** The buyer's purchases of other creators' samples, one entry per sample. */
export function samplePurchasesOf(sales: readonly SampleSale[], buyerId: DemoBuyerId, resales: readonly Resale[] = []): PurchasedProject[] {
  const out: PurchasedProject[] = [];
  const firsts = new Map<string, FirstSale>();
  for (const s of sales) {
    const key = sampleSaleKeyOf(s);
    if (key) firsts.set(key, { buyer: s.buyerId, price: s.price, token: s.token, at: s.at });
  }
  for (const m of SAMPLE_MARKETS) {
    const sold = soldOf(buyerId, m.feedId, resales, firsts, m.post.creator.name);
    const lines = new Map<string, Draft>();
    for (const s of sales) {
      if (s.projectId !== m.feedId || (s.kind === "main" && s.buyerId !== buyerId)) continue;
      const copy: PurchaseCopy = {
        id: s.id,
        serial: s.serial,
        of: null,
        price: s.price,
        token: s.token,
        at: s.at,
        txHash: s.txHash,
        network: s.network,
        collection: SAMPLE_COLLECTION,
        tokenId: null,
        buyerAddress: s.buyerAddress,
        key: s.kind === "main" || s.serial === null ? s.id : sampleCopyKeyOf(s.projectId, s.kind, /business/i.test(s.name) ? "Business use" : "Personal use", s.serial),
        from: null,
        listing: null,
      };
      if (s.kind === "main") {
        add(lines, "main", null, null, copy, 100);
        continue;
      }
      const use: PurchaseUse = /business/i.test(s.name) ? "Business use" : "Personal use";
      const offer = copyUsesOf(m, s.kind).find((o) => o.use === use);
      const held = asHeld({ ...copy, of: offer?.sold?.of ?? null }, s.buyerId, buyerId, resales);
      if (held) add(lines, s.kind, use, null, held);
    }
    if (!lines.size && !sold.length) continue;
    const all = sales.filter((s) => s.projectId === m.feedId);
    const mainTo = all.find((s) => s.kind === "main" && s.buyerId !== buyerId)?.buyerId ?? null;
    const buyable = (["physical", "virtual"] as EditionKind[]).filter((k) => copyUsesOf(m, k).some((o) => copyUseBlockOf(o, m.feedId, sales) === null));
    out.push(
      projectOf(
        {
          id: m.feedId,
          source: "sample",
          name: m.post.title,
          cover: sampleCoverOf(m.post),
          creator: m.post.creator.name,
          marketHref: `/marketplace/${m.feedId}`,
          products: m.post.products.map((x) => x.name),
          buyable: mainTo ? [] : buyable,
          soldInFullTo: mainTo ? buyerNameOf(mainTo) : null,
          sold,
        },
        lines,
      ),
    );
  }
  return out;
}

function buyerNameOf(id: DemoBuyerId): string {
  return DEMO_BUYERS.find((b) => b.id === id)?.name ?? "another creator";
}

/** A copy's key from its first sale: a sample's (feed, kind, use, number) or this browser's own (project, track,
 *  number); null for the Main NFT. */
export function sampleSaleKeyOf(s: SampleSale): string | null {
  return s.kind === "main" || s.serial === null ? null : sampleCopyKeyOf(s.projectId, s.kind, /business/i.test(s.name) ? "Business use" : "Personal use", s.serial);
}
export function ownSaleKeyOf(s: Sale): string | null {
  return s.item.nft === "main" ? null : ownCopyKeyOf(s.projectId, s.item.trackId, s.item.serial);
}

/** Who bought the copy first (from its creator), by its key; null when no sale has it. */
export function firstBuyerOf(copyKey: string, sampleSales: readonly SampleSale[], sales: readonly Sale[]): DemoBuyerId | null {
  return sampleSales.find((s) => sampleSaleKeyOf(s) === copyKey)?.buyerId ?? sales.find((s) => ownSaleKeyOf(s) === copyKey)?.buyerId ?? null;
}

/** Who holds a listed copy now, so a listing whose seller sold it meanwhile reads as off sale. */
export function holderNowOf(copyKey: string, sampleSales: readonly SampleSale[], sales: readonly Sale[], resales: readonly Resale[]): DemoBuyerId | null {
  const first = firstBuyerOf(copyKey, sampleSales, sales);
  return first ? holderOf(copyKey, first, resales) : null;
}

/** This browser's own copy's track, from its key (`project:track:#n`). */
export function ownTrackIdOf(copyKey: string, projectId: string): string | null {
  const rest = copyKey.startsWith(`${projectId}:`) ? copyKey.slice(projectId.length + 1) : null;
  const m = rest ? /^(.+):#\d+$/.exec(rest) : null;
  return m ? m[1] : null;
}

/** What a holder lists when they sell this copy on; null for the Main NFT (sold from its own project's Earn). */
export function resaleDraftOf(p: Pick<PurchasedProject, "id" | "source" | "name">, line: PurchaseLine, c: PurchaseCopy, royaltyPct: number): ResaleDraft | null {
  if (line.kind === "main" || c.serial === null || line.use === null) return null;
  return {
    copyKey: c.key,
    source: p.source,
    projectId: p.id,
    projectName: p.name,
    kind: line.kind,
    use: line.use,
    product: line.product,
    serial: c.serial,
    of: c.of,
    token: c.token,
    network: c.network,
    royaltyPct,
  };
}

/** The buyer holds only the whole project (100%): it is their own project, opened as one (owner, 2026-11-19: "a Main
 *  NFT bought opens like normal project details, with the purchase shown there — no purchase view in between"). */
export function wholeProjectOnly(p: Pick<PurchasedProject, "lines">): boolean {
  return p.lines.length > 0 && p.lines.every((l) => l.kind === "main" && (l.sharePct ?? 0) >= 100);
}

/** The project a whole project bought opens as: a sample's own copy for the buyer (acquired-projects.ts), or this
 *  browser's project itself. */
export function wholeProjectIdOf(p: Pick<PurchasedProject, "id" | "source">): string {
  return p.source === "sample" ? `${ACQUIRED_PREFIX}${p.id}` : p.id;
}

/** Where a purchase opens: a whole project bought, its project page; anything else, its purchased page. */
export function purchaseHrefOf(p: Pick<PurchasedProject, "id" | "source" | "lines">): string {
  return wholeProjectOnly(p) ? `/projects/${encodeURIComponent(wholeProjectIdOf(p))}` : `/projects/purchased/${encodeURIComponent(p.id)}`;
}

/** The purchased page of a project the buyer holds copies of a kind that unlocks its files (a Physical NFT or
 *  the whole project), for the Innovations product page's locked pieces; null when they hold none. */
export function heldFilesHrefOf(purchases: readonly PurchasedProject[], projectId: string): string | null {
  const p = purchases.find((x) => x.id === projectId);
  if (!p || !p.lines.some((l) => l.kind === "physical" || l.kind === "main")) return null;
  return p.lines.some((l) => l.kind === "main" && (l.sharePct ?? 0) >= 100) ? `/projects/${encodeURIComponent(wholeProjectIdOf(p))}` : purchaseHrefOf(p);
}

/** Every purchase of the buyer, newest first. */
export function purchasedProjectsOf(own: PurchasedProject[], samples: PurchasedProject[]): PurchasedProject[] {
  return [...own, ...samples].sort((a, b) => b.lastAt - a.lastAt);
}

/** "Physical NFT · Business use" · "Whole project · 100%" · "Virtual NFT · Personal use · PlantPal". */
export function lineTitleOf(l: PurchaseLine): string {
  if (l.kind === "main") return `${KIND_NAME.main} · ${l.sharePct ?? 0}%`;
  return [KIND_NAME[l.kind], l.use, l.product].filter(Boolean).join(" · ");
}

/** "2 copies · #7, #8 of 50" · "1 copy · #3". */
export function copiesLineOf(l: PurchaseLine): string {
  const n = l.copies.length;
  const serials = l.copies.map((c) => c.serial).filter((s): s is number => s !== null);
  const of = l.copies.find((c) => c.of !== null)?.of ?? null;
  const nums = serials.length ? ` · ${serials.map((s) => `#${s}`).join(", ")}${of !== null ? ` of ${of}` : ""}` : "";
  return `${n} ${n === 1 ? "copy" : "copies"}${nums}`;
}

/** The short chips a card shows: "Whole project · 100%", "Physical NFT ×2", "Virtual NFT ×1". */
export function cardChipsOf(p: PurchasedProject): string[] {
  const out: string[] = [];
  for (const kind of KIND_ORDER) {
    const lines = p.lines.filter((l) => l.kind === kind);
    if (!lines.length) continue;
    if (kind === "main") out.push(lineTitleOf(lines[0]));
    else out.push(`${KIND_NAME[kind]} ×${lines.reduce((n, l) => n + l.copies.length, 0)}`);
  }
  if (p.forSale > 0) out.push(`For sale ×${p.forSale}`);
  if (p.sold.length > 0) out.push(`Sold ×${p.sold.length}`);
  return out;
}

/** What a buyer holds of a project, said on its marketplace pages (owner, 2026-11-24: a bare "See what you
 *  own" didn't say what): "the Main NFT" · "a 10% share of the Main NFT" · "2 Virtual NFTs" ·
 *  "1 Physical NFT and 2 Virtual NFTs". Web terms only (never "Whole project"). Null when nothing is held. */
export function ownedWhatOf(p: Pick<PurchasedProject, "lines">): string | null {
  const parts: string[] = [];
  const main = p.lines.filter((l) => l.kind === "main");
  if (main.length > 0) {
    const pct = main.reduce((n, l) => n + (l.sharePct ?? 0), 0);
    parts.push(pct >= 100 ? "the Main NFT" : `a ${pct}% share of the Main NFT`);
  }
  for (const kind of ["physical", "virtual"] as const) {
    const n = p.lines.filter((l) => l.kind === kind).reduce((sum, l) => sum + l.copies.length, 0);
    if (n > 0) parts.push(`${n} ${KIND_NAME[kind]}${n === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** A bought copy's title (owner, 2026-11-25: "#1 of 50" read as a code): "Copy #7 of 50" · "Copy #3" · "Copy". */
export function copyTitleOf(serial: number | null, of: number | null): string {
  if (serial === null) return "Copy";
  return of !== null ? `Copy #${serial} of ${of}` : `Copy #${serial}`;
}

/** What the copy's number means, for its ⓘ help. `use` and `kind` name the listing the copy came from. */
export function copyNumberHelpOf(serial: number | null, of: number | null, kind: "physical" | "virtual", use: string | null): string {
  const what = `${use ? `${use} ` : ""}${KIND_NAME[kind]}s`;
  if (serial === null) return `One of the ${what} you bought. The copy is yours until you sell it on.`;
  const which = of !== null ? `Copy ${serial} of the ${of} ${what} the creator listed` : `Copy ${serial} of the ${what}, in the order they were bought`;
  return `${which}. Its number stays with it, even when you sell it on.`;
}

/** The uses held, Personal first. */
export function usesOf(p: PurchasedProject): PurchaseUse[] {
  return (["Personal use", "Business use"] as PurchaseUse[]).filter((u) => p.lines.some((l) => l.use === u));
}
