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
// The use rules are the prototype's defaults until the owner words them (decision open).
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { Token } from "../brief/types";
import { addAmounts } from "../wallet/money";
import type { Amount, DemoBuyerId } from "../wallet/types";
import type { SampleSale } from "./phone-sample-sales";
import { copyUsesOf, sampleCoverOf, SAMPLE_MARKETS, type SampleUse } from "./sample-market";
import { PROJECT_SCOPE, type EditionKind, type EditionTrack, type EditionUse, type Sale } from "./types";

export type PurchaseKind = "main" | EditionKind;
export type PurchaseUse = SampleUse;

export const USE_OF: Record<EditionUse, PurchaseUse> = { private: "Personal use", commercial: "Business use" };
export const KIND_NAME: Record<PurchaseKind, string> = { main: "Whole project", physical: "Physical NFT", virtual: "Virtual NFT" };

/** What each use allows — the prototype's defaults until the owner words them. */
export const USE_RULES: Record<EditionKind, Record<PurchaseUse, string>> = {
  physical: {
    "Personal use": "Build it for yourself from its fabrication files. Not for sale.",
    "Business use": "Build it and sell what you build, as many as your copies allow.",
  },
  virtual: {
    "Personal use": "Use its 3D model and preview in your own, non-commercial work.",
    "Business use": "Use its 3D model and preview in commercial work: ads, games, product pages.",
  },
};

/** What a Main NFT gives, by the share held. */
export function mainRuleOf(sharePct: number): string {
  return sharePct >= 100
    ? "The whole project is yours: every file, the right to list it and its royalties."
    : `You own ${sharePct}% of the project: that share of its sales and royalties.`;
}

/** What comes with each kind, as files. */
export const FILES_OF: Record<PurchaseKind, string[]> = {
  main: ["Every file of the project: PCB, code, 3D, wiring and parts"],
  physical: ["PCB fabrication files (Gerber)", "Enclosure (STEP and STL)", "Bill of materials (CSV)", "Assembly guide (PDF)"],
  virtual: ["3D model (GLB)", "Preview renders (PNG)"],
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
};

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
  lines: PurchaseLine[];
  /** How many NFTs: each copy, and the Main NFT once. */
  count: number;
  lastAt: number;
};

const KIND_ORDER: PurchaseKind[] = ["main", "physical", "virtual"];
const USE_ORDER: (PurchaseUse | null)[] = [null, "Personal use", "Business use"];

type Draft = Omit<PurchaseLine, "paid">;

function finish(lines: Map<string, Draft>): PurchaseLine[] {
  return [...lines.values()]
    .map((l) => {
      const byToken = new Map<Token, Amount>();
      for (const c of l.copies) byToken.set(c.token, byToken.has(c.token) ? addAmounts(byToken.get(c.token) as Amount, c.price) : c.price);
      return { ...l, copies: [...l.copies].sort((a, b) => a.at - b.at), paid: [...byToken].map(([token, amount]) => ({ amount, token })) };
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

function projectOf(base: Omit<PurchasedProject, "lines" | "count" | "lastAt">, lines: Map<string, Draft>): PurchasedProject {
  const done = finish(lines);
  const all = done.flatMap((l) => l.copies);
  return {
    ...base,
    lines: done,
    count: done.reduce((n, l) => n + (l.kind === "main" ? 1 : l.copies.length), 0),
    lastAt: Math.max(...all.map((c) => c.at)),
  };
}

/** The buyer's purchases of this browser's own listings, one entry per project. */
export function ownPurchasesOf(
  sales: readonly Sale[],
  buyerId: DemoBuyerId,
  projects: readonly { id: string; name: string; cover: string | null }[],
  tracks: readonly EditionTrack[],
  creator: string,
): PurchasedProject[] {
  const byProject = new Map<string, Map<string, Draft>>();
  for (const s of sales) {
    if (s.buyerId !== buyerId) continue;
    const lines = byProject.get(s.projectId) ?? new Map<string, Draft>();
    const copy: PurchaseCopy = { id: s.id, serial: null, of: null, price: s.price, token: s.token, at: s.at, txHash: s.txHash };
    if (s.item.nft === "main") add(lines, "main", null, null, copy, s.item.sharePct);
    else {
      const it = s.item;
      const track = tracks.find((t) => t.id === it.trackId);
      add(lines, it.nft, USE_OF[it.use], it.productId === PROJECT_SCOPE ? null : it.productName, {
        ...copy,
        serial: it.serial,
        of: track?.supply.total ?? null,
      });
    }
    byProject.set(s.projectId, lines);
  }
  const out: PurchasedProject[] = [];
  for (const [id, lines] of byProject) {
    const p = projects.find((x) => x.id === id);
    if (!p) continue;
    out.push(projectOf({ id, source: "own", name: p.name, cover: p.cover, creator, marketHref: `/marketplace/${id}` }, lines));
  }
  return out;
}

/** The buyer's purchases of other creators' samples, one entry per sample. */
export function samplePurchasesOf(sales: readonly SampleSale[], buyerId: DemoBuyerId): PurchasedProject[] {
  const out: PurchasedProject[] = [];
  for (const m of SAMPLE_MARKETS) {
    const mine = sales.filter((s) => s.projectId === m.feedId && s.buyerId === buyerId);
    if (!mine.length) continue;
    const lines = new Map<string, Draft>();
    for (const s of mine) {
      const copy: PurchaseCopy = { id: s.id, serial: s.serial, of: null, price: s.price, token: s.token, at: s.at, txHash: s.txHash };
      if (s.kind === "main") {
        add(lines, "main", null, null, copy, 100);
        continue;
      }
      const use: PurchaseUse = /business/i.test(s.name) ? "Business use" : "Personal use";
      const offer = copyUsesOf(m, s.kind).find((o) => o.use === use);
      add(lines, s.kind, use, null, { ...copy, of: offer?.sold?.of ?? null });
    }
    out.push(
      projectOf(
        { id: m.feedId, source: "sample", name: m.post.title, cover: sampleCoverOf(m.post), creator: m.post.creator.name, marketHref: `/marketplace/${m.feedId}` },
        lines,
      ),
    );
  }
  return out;
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
  return out;
}

/** The uses held, Personal first. */
export function usesOf(p: PurchasedProject): PurchaseUse[] {
  return (["Personal use", "Business use"] as PurchaseUse[]).filter((u) => p.lines.some((l) => l.use === u));
}
